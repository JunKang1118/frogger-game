## About The Project
The project is mainly built using MVC architecture and Observable pattern, a push-based
implementation that observes asynchronous user interface events in streams and performs
corresponding actions. The main observable observes keyboard and mouse-click
(Controller), perform updates on the State which keep tracks of all the data in the game
(Model) then updates the view in index.html (View)

Frog and other objects are declared as types and every object together with their attributes
are captured in the state. State also contains game-related variables such as score and
difficulty. Observables capture events and updates state accordingly, then updates the HTML
display. The tick observables trigger every time interval and it moves the objects such as
wood and car, then also checks for interaction such as collision, score increment or reset.

## Introduction to the project
The player is the frog which can move in four directions. It can either reach the scorezone
(red box) or eat the fly to earn scores. To do that, the player has to avoid the cars on the
ground and avoid falling into the river by standing on the wood. After scoring in all five score
zones, the speed of objects will increase. There is a one-way teleporter located in the
middle of the river, which the player can stand on and teleport to the end of the teleporter. If
the frog dies, a game over text will appear and the frog cannot move anymore. Players can
click on the restart button to restart the game, however the text might take a while to
disappear.

## Built With
* [Typescript][ts-url]

[ts-url]: https://www.typescriptlang.org/

## Getting Started
* npm
  ```sh
  npm install npm@latest -g
  npm run build
  ```
* install rxjs dependency
* open dist/index.html in browser
