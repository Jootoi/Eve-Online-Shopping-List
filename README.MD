# EVE Online Shopping List Tool
A tool that allows building shopping list outside the game, which can then be shared as text to other players or imported to the game for easier buying. Built for Principles of Programming Graphical User Interfaces course as optional project work. Working copy can be found [here](http://oikeetvastaukset.ddns.net:80/ReactTestspace/Project/).

## Some details
The whole app is written with JavaScript (React/MaterialUI) with no backend. Static data is genererated from [EVE Online static data export](https://developers.eveonline.com/resource/resources). Dynamic content (live price data) is fetched from [EVE Swagger Interface](https://esi.evetech.net/ui) and some images are loaded from [EVE Online image servers](https://image.eveonline.com/).

## Setting up a copy
### Requirements:
1. Python 3 (See requirements.txt for packages)
2. Nodejs (with create-react-app)
3. HTTP server

### Steps:
1. Clone this project.
2. Download EVE static data export files from [here](https://developers.eveonline.com/resource/resources). You will need SDE (sde-'something'.zip) and icon ('something'_Icons.zip) files.
3. Move the downloaded files to project folder you cloned and run `initStaticFiles.py` with zip file names as parameters.
4. Now build the project with  `npm run build`.
5. Server /build file contents with HTTP server