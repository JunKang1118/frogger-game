import "./style.css";
import { fromEvent, interval, merge } from 'rxjs'; 
import { map, filter, scan } from 'rxjs/operators';

function main() {
  
  const svg = document.querySelector("#svgCanvas") as SVGElement & HTMLElement;

  /////////////////////////////////////////////////////////////////////////////////////////
  //                         Basis Setup                                                 //
  /////////////////////////////////////////////////////////////////////////////////////////
  type Key   = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'
  type Event = 'keydown' | 'keyup'

  const CONSTANTS = {

    // Canvas
    CANVAS_HEIGHT : 600,
    CANVAS_WIDTH  : 650,
    SIZE_PER_BOX  : 50,

    // Game constants
    GAME_TICK_INTERVAL : 100,
    ROWS_OF_OBJECTS:10,

    // Frog constants
    FROG_STARTING_X:300,
    FROG_STARTING_Y:550,
    FROG_MOVE_DISTANCE:50,

    // Car constants
    CARS_STARTING_ROW:7,
    ROWS_OF_CARS:4,
    CAR_SPEED:15,
    TRUCK_SPEED:5,
    SAFE_ZONE_ROW:1,

    // Wood constants
    ROWS_OF_WOODS:6,
    WOOD_SPEED:3,
    WOOD_STARTING_ROW:1,

    // Scorezone constants
    NUMBER_OF_SCORE_ZONE:5
  } as const


  /////////////////////////////////////////////////////////////////////////////////////////
  //                         Classes for diffentiating Observables                       //
  /////////////////////////////////////////////////////////////////////////////////////////
  class Tick { constructor(public readonly elapsed:number) {} }
  class MoveLeft { constructor() {} }
  class MoveRight { constructor() {} }
  class MoveUp { constructor() {} }
  class MoveDown { constructor() {} }
  class Restart { constructor() {} }


  /////////////////////////////////////////////////////////////////////////////////////////
  //                             Observables                                             //
  /////////////////////////////////////////////////////////////////////////////////////////
  const $gameClock = interval(CONSTANTS.GAME_TICK_INTERVAL).pipe(map(x=>new Tick(x)))
  const keyObservable = <T>(e:Event, k: Key, result:()=>T)=>
                        fromEvent<KeyboardEvent>(document,e).pipe(
                        filter(({code})=>code===k),
                        filter(({repeat})=>!repeat),
                        map(result)),
  $moveLeft  = keyObservable('keydown','ArrowLeft',()=>new MoveLeft()),
  $moveUp    = keyObservable('keydown','ArrowUp',()=>new MoveUp()),
  $moveRight = keyObservable('keydown','ArrowRight',()=>new MoveRight()),
  $moveDown  = keyObservable('keydown','ArrowDown',()=>new MoveDown()),
  $click     = fromEvent(document.getElementById('button')!, 'click').pipe(map(()=>new Restart));


  /////////////////////////////////////////////////////////////////////////////////////////
  //                         In Game Objects                                             //
  /////////////////////////////////////////////////////////////////////////////////////////
  type Frog = Readonly<{
    id: string,
    x: number,
    y: number
  }>

  type Car = Readonly<{
    id: string,
    x: number,
    y: number,
    speed: number,
    width:number,
    height:number
    image:string
  }>

  type Wood = Readonly<{
    id: string,
    x: number,
    y: number,
    speed: number,
    width: number,
    height:number,
    image:string
  }>

  type ScoreZone = Readonly<{
    id: string,
    x: number,
    image:string,
    scored: boolean
  }>

  type Fly = Readonly<{
    id: string,
    x:number,
    y:number,
    speed:number,
    width: number,
    height:number,
    image:string,
    killed:boolean
  }>

  type Teleporter = Readonly<{
    id: string,
    x:number,
    y:number,
    image:string,
    width: number,
    height: number,
    destination: null|Teleporter
  }>

  /////////////////////////////////////////////////////////////////////////////////////////
  //                         Create Object Function                                      //
  /////////////////////////////////////////////////////////////////////////////////////////
  const createFrog = ()=>
    <Frog>{
      id: 'frog',
      x : CONSTANTS.FROG_STARTING_X,
      y : CONSTANTS.FROG_STARTING_Y
    }

  const createCar = (firstrow:number) => (rowNum:number) =>(direction:number)=> (x:number)=>
    <Car>{
      id          : "CAR_"  + rowNum,
      x           : x,
      y           : firstrow + (rowNum)*50,
      speed       : rowNum?
                    (direction?CONSTANTS.CAR_SPEED:-1*CONSTANTS.CAR_SPEED):
                    (direction?CONSTANTS.TRUCK_SPEED:-1*CONSTANTS.TRUCK_SPEED),
      width       : rowNum?CONSTANTS.SIZE_PER_BOX:CONSTANTS.SIZE_PER_BOX*2,
      height      : CONSTANTS.SIZE_PER_BOX,
      image       : rowNum?
                    (direction?"../images/car-right.png":"../images/car-left.png"):
                    (direction?"../images/truck-right.png":"../images/truck-left.png")
    }

  const createWood = (firstrow:number) => (rowNum:number) => (arrayID:number)=> (x:number)=>  
    <Wood>{
      id          : "Wood_" + rowNum + "_" + arrayID,
      x           : (rowNum+arrayID)*50,
      y           : firstrow + (rowNum)*50,
      speed       : rowNum%2?CONSTANTS.WOOD_SPEED:-1*CONSTANTS.WOOD_SPEED,
      width       : CONSTANTS.SIZE_PER_BOX,
      height      : CONSTANTS.SIZE_PER_BOX,
      image       : "../images/wood.png"  
    }
  
  const createScoreZone = (index:number) => 
    <ScoreZone>{
      id     : "ScoreZone_" + index,
      x      : index*(150),
      image  : "../images/frog.jpg",
      scored : false
    }

  const createFly = (wood:Wood) => (index:number) =><Fly>{
    id          : "fly_" + index,
    wood        : wood,
    x           : wood.x,
    y           : wood.y,
    width       : CONSTANTS.SIZE_PER_BOX,
    height      : CONSTANTS.SIZE_PER_BOX,
    speed       : wood.speed,
    image       : "../images/fly.png",
    killed      : false
  }

  const createTeleporter = (index:number) =>(rowNum:number)=>(destination:null|Teleporter)=> <Teleporter>{
    id          : "teleporter_" + index,
    x           : CONSTANTS.CANVAS_WIDTH/6,
    y           : (rowNum+2)*CONSTANTS.SIZE_PER_BOX,
    width       : CONSTANTS.SIZE_PER_BOX,
    height      : CONSTANTS.SIZE_PER_BOX,
    image       : "../images/teleporter.png",
    destination : destination
  }


  /////////////////////////////////////////////////////////////////////////////////////////
  //                         Create List Of Objects Function                             //
  /////////////////////////////////////////////////////////////////////////////////////////

  // Higher order function applied
  const initialObjectProperty = (f:()=>number):number[] => [...Array(CONSTANTS.ROWS_OF_OBJECTS)].map(f)
  // Creates an array of 1/-1 to indicates direction
  const initialObjectDirection:number[] = initialObjectProperty(()=>Math.round(Math.random()))
  // Creates an array of x
  const initialObjectX:number[] = initialObjectProperty(()=>Math.round(Math.random()*CONSTANTS.CANVAS_WIDTH))

  // Creates an array of cars
  const createCars =  [...Array(CONSTANTS.ROWS_OF_CARS)]
    .map((_,i)=>createCar(CONSTANTS.CARS_STARTING_ROW*50)
                         (i)
                         (initialObjectDirection[CONSTANTS.CARS_STARTING_ROW+i-1])
                         (initialObjectX[CONSTANTS.CARS_STARTING_ROW+i-1]))

  // Creates an array of woods
  const createWoods = (arrayID:number) => [...Array(CONSTANTS.ROWS_OF_WOODS)]
    .map((_,i)=>createWood(CONSTANTS.WOOD_STARTING_ROW*50)
                          (i)
                          (arrayID)
                          (initialObjectX[CONSTANTS.WOOD_STARTING_ROW+i-1]))

  // Create an array of scorezones
  const createScoreZones = [...Array(CONSTANTS.NUMBER_OF_SCORE_ZONE)]
    .map((_,i)=>createScoreZone(i))

  // Creates an array of two teleporters
  const createTeleporters = [...Array(2)].map((_,i)=>createTeleporter(i)(i*3)(null))  


  /////////////////////////////////////////////////////////////////////////////////////////
  //                                Object Functions                                     //
  /////////////////////////////////////////////////////////////////////////////////////////

  // Input car moves based on its speed and current difficulty
  const moveCar = (difficulty:number) => (car:Car) => <Car>{
    ...car,
    x: car.speed>0?
       (car.x>650?-50:car.x+car.speed + (3*difficulty)):
       (car.x<-50?650:car.x+car.speed - (3*difficulty))
  }

  // Input wood moves based on its speed and current difficulty
  const moveWood = (difficulty:number) => (wood:Wood) =>  <Wood>{
    ...wood,
    x: wood.speed>0?
       (wood.x>650?-50:wood.x+wood.speed + (3*difficulty)):
       (wood.x<-50?650:wood.x+wood.speed - (3*difficulty))
  }

  // Input scorezone update based on location of frog
  const updateScoreZone = (scorezone:ScoreZone) => (frog:Frog) =><ScoreZone>{
    ...scorezone,
    scored: scorezone.scored?
              scorezone.scored:
              (frog.y<50)&&
              (frog.x>scorezone.x?frog.x:scorezone.x)-(frog.x>scorezone.x?scorezone.x:frog.x)<=10?true:false
  }

  // Input fly moves based on its speed and current difficulty
  const movefly = (difficulty:number) => (fly:Fly) =>  <Fly>{
    ...fly,
    x: fly.speed>0?
       (fly.x>650?-50:fly.x+fly.speed + (3*difficulty)):
       (fly.x<-50?650:fly.x+fly.speed - (3*difficulty))
  }


  /////////////////////////////////////////////////////////////////////////////////////////
  //                               State                                                 //
  /////////////////////////////////////////////////////////////////////////////////////////
  type State = Readonly<{
    time         : number,
    frog         : Frog,
    Car          : Readonly<Car[]>,
    Wood         : Readonly<Wood[]>,
    fly          : Readonly<Fly[]>,
    teleporter   : Readonly<Teleporter[]>,
    scoreZone    : Readonly<ScoreZone[]>,
    gameOver     : boolean,
    score        : number,
    highestScore : number
    difficulty   : number
  }>

  // Initial State
  const initialState:State ={
    time         : 0,
    frog         : createFrog(),
    Wood         : [2,3,7,8,9].reduce((a,b)=>a.concat(createWoods(b)),createWoods(1)),
    Car          : createCars.filter((_,i)=>i!=CONSTANTS.SAFE_ZONE_ROW),
    fly          : [],
    teleporter   : createTeleporters,
    scoreZone    : createScoreZones,
    gameOver     : false,
    score        : 0,
    highestScore : 0,
    difficulty   : 1
  }  


  /////////////////////////////////////////////////////////////////////////////////////////
  //                                In Game Logic                                        //
  /////////////////////////////////////////////////////////////////////////////////////////
  const handleCollisions = (s:State)=>{
    const
        // Car session
        // Check whether given car has collided with the frog
        frogAndCarCollided = ([a,b]:[Frog,Car]) => (a.x>b.x?a.x-b.x:b.x-a.x)<((b.width + 50)/2)
                                                   && 
                                                   (a.y>b.y?a.y-b.y:b.y-a.y) < 50,
        // Check whether there is car collided with the frog
        frogCrashed = s.Car.filter(car=>frogAndCarCollided([s.frog,car])).length > 0,

        /////////////////////////////////////////////////////////////////////////////////////////

        // Wood session
        // Check whether given wood has collided with the frog
        frogAndWoodCollided = ([a,b]:[Frog,Wood]) => (a.x>b.x?a.x-b.x:b.x-a.x)
                                                     +
                                                     (a.y>b.y?a.y-b.y:b.y-a.y) <= 25,
                                                     
        // Check whether there is wood that frog is on it
        WoodFrogIsOn = s.Wood.filter(wood=>frogAndWoodCollided([s.frog,wood])).length > 0?
                                                                s.Wood.filter(wood=>frogAndWoodCollided([s.frog,wood])):
                                                                [],
        
        /////////////////////////////////////////////////////////////////////////////////////////

        // Fly session
        // Check whether given fly has collided with the frog
        frogAndFlyCollided = ([a,b]:[Frog,Fly]) => (a.x>b.x?a.x-b.x:b.x-a.x)+(a.y>b.y?a.y-b.y:b.y-a.y) < 50,

        // Check whether frog has collided with the fly 
        frogAteFly = s.fly.filter(fly=>frogAndFlyCollided([s.frog,fly])).length > 0,                                                        

        /////////////////////////////////////////////////////////////////////////////////////////

        // Teleporter session
        // Check whether given teleporter has collided with the frog
        frogAndTeleporterCollided = ([a,b]:[Frog,Teleporter]) =>
                                                     ((a.x>b.x?a.x-b.x:b.x-a.x)
                                                     +
                                                     (a.y>b.y?a.y-b.y:b.y-a.y) <= 25),

        // Check whether there is teleporter collided with the frog                                             
        frogOnTeleporter = s.teleporter.filter(teleporter=>frogAndTeleporterCollided([s.frog,teleporter])).length > 0 ,  
        
        // Check whether there is frog on start teleporter
        frogOnStartTeleporter = frogOnTeleporter?
                                s.teleporter.filter(teleporter=>frogAndTeleporterCollided([s.frog,teleporter]))[0].destination!==null:
                                false ,

        // Check whether the teleporters are connected
        teleportConnected = s.teleporter[1].destination!==null ,
        
        /////////////////////////////////////////////////////////////////////////////////////////

        // Basic logic session
                                
        // Check whether frog is drowned
        // If frog not on wood and not on teleporter and is on river session, return true
        frogDrowned = WoodFrogIsOn.length < 1 && s.frog.y<350 && s.frog.y>=50 && !frogOnTeleporter,

        // Check if frog reached the score zone
        frogReached = s.frog.y < 50     

    // If scorezone are not all filled, keep handle logic and movements
    return s.scoreZone.filter((scorezone)=>scorezone.scored).length !== CONSTANTS.NUMBER_OF_SCORE_ZONE?
    <State>{ 
      ...s,
      // Game over true is frog crashed with car or drowned
      gameOver     : s.gameOver?s.gameOver:(frogCrashed || frogDrowned),

      // If frog reached, then back to starting point, 
      // else if frog is on start teleporter, then teleport to destination, 
      // else if frog is on wood, then follows the wood,
      // else stays
      frog         : {...s.frog,
                      x:frogReached?
                        CONSTANTS.FROG_STARTING_X:
                        (frogOnStartTeleporter?
                            s.teleporter[1].destination?.x:
                            (WoodFrogIsOn.length?WoodFrogIsOn[0].x:s.frog.x)),
                      y:frogReached?
                        CONSTANTS.FROG_STARTING_Y:
                        (frogOnStartTeleporter?
                            s.teleporter[1].destination?.y:
                            (WoodFrogIsOn.length?WoodFrogIsOn[0].y:s.frog.y))
                     },
      
      // If frog eaten fly, add 100 to score
      // If frog reached scorezone, add 100 to score               
      score        : frogAteFly?
                     100+(frogReached?s.score+100:s.score):
                     (frogReached?s.score+100:s.score),

      // Map every scorezone to the function that handles logic               
      scoreZone    : s.scoreZone.map((scorezone)=>updateScoreZone(scorezone)(s.frog)),

      // If no fly exists then create a fly on one of the woods
      // If fly is eaten then remove from map and indicates killed
      fly          : s.fly.length ? 
                      (frogAteFly?
                        s.fly.map((fly)=><Fly>{...fly,killed:true}):
                        s.fly): 
                      [createFly(s.Wood[2])(0)],

      // If score higher than highest score, updates the highest score
      highestScore : s.score>s.highestScore?s.score:s.highestScore,

      // If teleporters not connected then connects them
      teleporter   : teleportConnected?s.teleporter:s.teleporter.map((_,i)=>i===1?
                                                        <Teleporter>{...s.teleporter[i],destination:s.teleporter[0]}:
                                                        s.teleporter[i])
    }:
    // Else return initial state with increased difficulty
    <State>{
      ...initialState,
      difficulty   : s.difficulty + 1,
      score        : s.score,
      highestScore : s.highestScore
    }    
  }
 
  // Actions for game clock
  const tick = (s:State,elapsed:number) => {
    return handleCollisions(<State>{...s,
      time:elapsed,
      Car: s.Car.map(moveCar(s.difficulty)),
      Wood: s.Wood.map(moveWood(s.difficulty)),
      fly: s.fly.length?s.fly.map(movefly(s.difficulty)):s.fly
    })
  }

  // Handle changes to state
  const reduceState =(s:State,e:MoveLeft|MoveRight|MoveUp|Tick|Restart)=>

    // Handles left movement of frog and ensures it doesn't go beyond boundary
    e instanceof MoveLeft?<State>{...s,
      frog: {...s.frog,x:s.gameOver?s.frog.x:(s.frog.x==0?0:s.frog.x-CONSTANTS.FROG_MOVE_DISTANCE)}
    } :
    // Handles right movement of frog and ensures it doesn't go beyond boundary 
    e instanceof MoveRight?<State>{...s,
      frog: {...s.frog,x:s.gameOver?s.frog.x:(s.frog.x==600?600:s.frog.x+CONSTANTS.FROG_MOVE_DISTANCE)}
    } :
    // Handles up movement of frog and ensures it can't go up unless its a scorezone
    e instanceof MoveUp?<State>{...s,
      frog: {...s.frog,
             y:s.gameOver?
               s.frog.y:
               (s.frog.y==50?
                  ((s.frog.x<=10)||(s.frog.x<=160&&s.frog.x>=140)||(s.frog.x<=310&&s.frog.x>=290)||(s.frog.x<=460&&s.frog.x>=440)||(s.frog.x>=590)?
                    (s.frog.y-CONSTANTS.FROG_MOVE_DISTANCE):
                     s.frog.y):
                  (s.frog.y-CONSTANTS.FROG_MOVE_DISTANCE))}
    }:
    // Handles down movement of frog and ensures it doesn't go beyond boundary
    e instanceof MoveDown?<State>{...s,
      frog: {...s.frog,y:s.gameOver?s.frog.y:(s.frog.y==550?550:s.frog.y+CONSTANTS.FROG_MOVE_DISTANCE)}
    }:
    // Handles restart of game, keeps the highest score
    e instanceof Restart?<State>{...initialState,highestScore:s.highestScore}
    :
    // Action for gameclock
    tick(s,e.elapsed);
  

  /////////////////////////////////////////////////////////////////////////////////////////
  //                                View Functions                                       //
  /////////////////////////////////////////////////////////////////////////////////////////
  function updateView(s: State) {

      // Update frog
      const frog = document.getElementById("frog")!;
      frog.setAttribute('transform', `translate(${s.frog.x},${s.frog.y})`);

      // Update Objects
      s.Car.forEach(updateCarView);
      s.Wood.forEach(updateWoodView);
      s.fly.forEach(updateFlyView);
      s.teleporter.forEach(updateTeleporterView);
      s.scoreZone.map((scorezone)=>updateScoreZoneView(scorezone));

      // Update scores
      const score = document.getElementById("score")!;
      score.innerHTML = "Score       : " + s.score
      const highestScore = document.getElementById("highestScore")!;
      highestScore.innerHTML =  s.highestScore + ""

      // Updates text if gameover
      if(s.gameOver){
        const v = document.createElementNS(svg.namespaceURI,"text")!;
        v.setAttribute('transform',`translate(${CONSTANTS.CANVAS_WIDTH/6},${CONSTANTS.CANVAS_HEIGHT/2})`);
        v.setAttribute('class',"gameover")
        v.setAttribute('id','gameOver')
        v.textContent = "Game Over";
        svg.appendChild(v);
      }
      // Removes text if game restarted
      else{
        const v = document.getElementById('gameOver')!;
        if(v!=null){
          svg.removeChild(v)
        }
      }
  };

  // Update subfunctions
  const updateCarView = (c:Car)=>{
    function createCarView(){
      const v = document.createElementNS(svg.namespaceURI,"image")!;
      v.setAttribute("id",c.id);
      svg.appendChild(v);
      return v;
    }
    const v = document.getElementById(c.id) || createCarView();
    v.setAttribute("transform",`translate(${c.x},${c.y})`);
    v.setAttribute("href",c.image);
    v.setAttribute("width",`${c.width}`);
    v.setAttribute("height",`${c.height}`);
  }

  const updateWoodView = (w:Wood)=>{
    function createWoodView(){
      const v = document.createElementNS(svg.namespaceURI,"image")!;
      v.setAttribute("id",w.id);
      svg.appendChild(v);
      return v;
    }
    const v = document.getElementById(w.id) || createWoodView();
    v.setAttribute("transform",`translate(${w.x},${w.y})`);
    v.setAttribute("href",w.image);
    v.setAttribute("width",`${w.width}`);
    v.setAttribute("height",`${w.height}`);
  }

  const updateScoreZoneView = (scorezone:ScoreZone)=>{
    if(scorezone.scored){
      if(document.getElementById(scorezone.id)==null){
        const v = document.createElementNS(svg.namespaceURI,"image")!;
        v.setAttribute("id",scorezone.id);
        v.setAttribute("href",scorezone.image);
        v.setAttribute("transform",`translate(${scorezone.x},${0})`);
        v.setAttribute("width",`${50}`);
        v.setAttribute("height",`${50}`);
        svg.appendChild(v);
      }
    }
    else{
      if(document.getElementById(scorezone.id)!=null){
        svg.removeChild(document.getElementById(scorezone.id)!)
      }
    }
  }

  const updateFlyView = (fly:Fly)=>{
    function createFlyView(){
      const v = document.createElementNS(svg.namespaceURI,"image")!;
      v.setAttribute("id",fly.id);
      svg.appendChild(v);
      return v;
    }
    if(!fly.killed){
      const v = document.getElementById(fly.id) || createFlyView();
      v.setAttribute("transform",`translate(${fly.x},${fly.y})`);
      v.setAttribute("href",fly.image);
      v.setAttribute("width",`${fly.width}`);
      v.setAttribute("height",`${fly.height}`);
    }
    else{
      if(document.getElementById(fly.id)!=null){
        svg.removeChild(document.getElementById(fly.id)!)
      }
    }
  }

  const updateTeleporterView = (teleporter:Teleporter)=>{
    if(document.getElementById(teleporter.id)===null){
      const v = document.createElementNS(svg.namespaceURI,"image")!;
      v.setAttribute("id",teleporter.id);
      v.setAttribute("transform",`translate(${teleporter.x},${teleporter.y})`);
      v.setAttribute("href",teleporter.image);
      v.setAttribute("width",`${teleporter.width}`);
      v.setAttribute("height",`${teleporter.height}`);
      svg.appendChild(v);
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////
  //                                Main Observable                                      //
  /////////////////////////////////////////////////////////////////////////////////////////
  const $subscription = merge($gameClock,$moveLeft,$moveRight,$moveUp,$moveDown,$click).pipe(scan(reduceState,initialState))
      .subscribe(updateView)
   
}
// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
