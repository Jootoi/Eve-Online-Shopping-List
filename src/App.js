import React, {Component} from 'react';
import { MuiThemeProvider } from 'material-ui/styles';
import { Snackbar, AppBar, Avatar, Chip, RaisedButton, Paper, TextField, DropDownMenu, MenuItem, List, ListItem, Card, CardHeader, CardText, Drawer, Toggle } from 'material-ui';
import Model from './Model.js';


class App extends Component {
  constructor(props) {
    super(props);
    //Creates instance of model and gets basic data needed (somewhat following MVC)
    this.model = new Model();
    this.model.addOnChangeListener(this.modelChangeListener);
    this.regions = this.model.getRegions();
    this.marketGroups = this.model.getMarketGroups();
    this.iconConversionTable = this.model.getIconConversionTable();
    this.model.fetchRegionalTypes(10000032)
    this.regionalTypes = [];
    //Reference to text field so that copy to clipboard can be used
    this.textFieldRef = undefined;
    //previous states for undo/redo
    this.previousStates = [];
    //Keyboard listener for keyboard shortcuts (ctrl-Z/ctrl-Y)
    document.addEventListener("keydown", this.keyboardListener)
    this.state = {
      selectedRegion:10000032,
      selected:undefined,
      shoppingList:[],
      search:"",
      result:undefined,
      filteredMarketGroups:this.marketGroups,
      menuOpen:false,
      hideUnavailable:false,
      textFieldContent:"",
      snackbarMessage:"",
      snackbarOpen:false,
      selectedItemPrice:"None",
      currentStateIndex:0,
      sortBy:"Default",
      sortFunction:undefined,
      sortDirection:"ASC"
    }
    
  }
  //Actual keyboard listener for undo (ctrl-Z)/redo (ctrl-Y)
  keyboardListener = (e) => {
    if(e.keyCode === 90 && e.ctrlKey) {
      e.preventDefault();
      this.undo();
    }
    else if(e.keyCode === 89 && e.ctrlKey) {
      e.preventDefault();
      this.redo();
    }
  }

  //Listens for changes in models part of MVC
 modelChangeListener = (whatChanged) => {
   switch(whatChanged) {
      case "regions":this.regions = this.model.getRegions();
        break;
      case "groups":this.marketGroups = this.model.getMarketGroups();
        break;
      case "icons":this.iconConversionTable = this.model.getIconConversionTable();
        break;
      case "types":this.types = this.model.getTypes();
      //Search is used to change this.state.filteredMarketGroups correctly
        this.search();
        break;
      case "regional_types":this.regionalTypes = this.model.getRegionalTypes();
      if(this.state !== undefined && this.state.hideUnavailable) {
        this.hideItems(this.regionalTypes);
        this.forceUpdate();
      }
          break;
    }
 }

//Listens for changes in region selection dropdown menu
  selectRegion = (e,i,v) => {
    this.updatePrices(v)
    this.setState({selectedRegion:v});
    this.model.fetchRegionalTypes(v);
  }

  //Update prices for shopping list (not the description window)
  updatePrices = (v) => {
    let promises = this.state.shoppingList.map(item => {
      return (this.model.getPrice(item.typeID,v)
      .then(res => {
        if(res !== undefined && res[0] !== undefined && res[0].length !== 0) {
          let sorted = res[0].sort((a,b) => a.price-b.price);
          return sorted[0].price;
        }
        else return undefined;
      })
      .then(price => item.regionalPrice = price));
    })
    Promise.all(promises).then(this.forceUpdate());
  }
  
//Listens for clicks in market bar to change selected items and to add items to cart if more than 1 click is registered
  selectItem = (e) => {
    //Make sure the click was actually on item (or atleast has numeric "value" property) and not something in between (like <div>)
    let value = (isNaN(parseInt(e.currentTarget.getAttribute("value"),10))) ? undefined:parseInt(e.currentTarget.getAttribute("value"),10);
    this.setState({selected:value});
    //Get price for selected item to be shown in the info box
    this.model.getPrice(value,this.state.selectedRegion).then(res => {
      if(res !== undefined && res[0] !== undefined && res[0].length !== 0) {
        let sorted = res[0].sort((a,b) => a.price-b.price);
        return sorted[0].price;
      }
      else return "None";
    })
    .then(price => this.setState({selectedItemPrice:price}));

    //Triggered when multiple successive clicks are registered
    if(e.detail>1 && value !== undefined) {
      this.addToCart(value);
    }
  }

//Adds item with typeID of "id" to shoppingList or increments amount of the item if already on the list.
  addToCart = (id) => {
    this.resetPoint();
    let sl = this.state.shoppingList;
    //Finds index of item with ID or -1
    let index = sl.findIndex(o => o.typeID === id);
    //If found increment by 1
    if(index>=0) {
      sl[index].amount = sl[index].amount+1;
      this.setState({shoppingList:sl});
    }
    //If not found find item from list of all items and add to shopping list with initial amount of 1.
    else {
      let item = this.types[id];
      item["amount"] = 1;
      sl.push(item);
      //Find price for the item
      this.model.getPrice(id,this.state.selectedRegion).then(res => {
        if(res !== undefined && res[0] !== undefined && res[0].length !== 0) {
          let sorted = res[0].sort((a,b) => a.price-b.price);
          item["regionalPrice"] = sorted[0].price;
        }
        
        else {
          item.regionalPrice = undefined;
        }
        return "done"; 
      })
      .then(s =>this.setState({shoppingList:sl}))
    }
    
  }

  //sort objects based on "regionalPrice property"
  sortPriceData = (a,b) => {
    return a.regionalPrice-b.regionalPrice;
  }

  //Changes amount of item indicated by index i
  amountChanger = (e,i) => {
    //Deep copy of the list 
    let shoppingListCopy = JSON.parse(JSON.stringify(this.state.shoppingList));
    //Same sorting as used in the UI
    if(this.state.sortBy !== "Default") {
      shoppingListCopy.sort(this.state.sortFunction);
      if(this.state.sortDirection === "DESC") {
        shoppingListCopy.reverse();
      }
    }
    let item = shoppingListCopy[i];
    item.amount = e.target.value;
    this.setState({shoppingList:shoppingListCopy});
  }

  //Listens for Chips "onRequestDelete" and deletes item indicated by index i
  deleteFromList = (i,e) => {
    this.resetPoint();
    //Deep copy of the list 
    let shoppingListCopy = JSON.parse(JSON.stringify(this.state.shoppingList));
    //Same sorting as used in the UI
    if(this.state.sortBy !== "Default") {
      shoppingListCopy.sort(this.state.sortFunction);
      if(this.state.sortDirection === "DESC") {
        shoppingListCopy.reverse();
      }
    }
    //Chips onRequestDelete triggers from backspace presses (unwanted behaviour) and stops inputs default behaviour
    if(e.keyCode !== 8) {
      shoppingListCopy.splice(i,1);
      this.setState({
        shoppingList:shoppingListCopy
      });
    }
    //Quick 'ghetto' fix for backspace, as the backspace does not work on the input field
    else this.backspaceOnInput(i);
    
  }
  
  //Tries to fix using backspace on the input field
  backspaceOnInput = (i) => {
    let shoppinglist = this.state.shoppingList;
    let item = shoppinglist[i];
    //Known bug: always removes last digit regardles of where the cursor is.
    item.amount = Math.floor(item.amount/10);
    this.setState({
      shoppingList:shoppinglist,
    });
  }

//Renders Card used for showing item information
  cardRender = () => {
    if(this.state.selected !== undefined) {
      //Get image of the item from eve online image servers
      let ava = <Avatar size = {100}  src = {"https://image.eveonline.com/Type/" + this.state.selected + "_64.png"} />;

      let item = this.types[this.state.selected];
      if(item !== undefined) {
        return (
        <Card>
        <CardHeader title = {item.name.en} avatar = {ava}/>
        <CardText>
          Description:&nbsp;{(item.description === undefined) ? "":item.description.en}
          <br/>
          Volume:&nbsp;{item.volume}&nbsp;m<sup>3</sup>&nbsp;&nbsp;&nbsp;
          Cost:&nbsp;{(this.state.selectedItemPrice === "None")?"Not available":this.state.selectedItemPrice + " ISK"}&nbsp;&nbsp;&nbsp;
          <RaisedButton label={"Add to list"} onClick={()=>this.addToCart(this.state.selected)}/>
        </CardText>
        </Card>
        )
      }
    
    }
    
  }

  //Renders the Chips used in shopping list
  shoppingListRender = () => {
    //Sort the shopping list based on user selection
    let shoppingListCopy = JSON.parse(JSON.stringify(this.state.shoppingList));
    if(this.state.sortBy !== "Default") {
      shoppingListCopy.sort(this.state.sortFunction);
      if(this.state.sortDirection === "DESC") {
        shoppingListCopy.reverse();
      }
    }
    //<span>'s are used to get proper tooltips for all values
    return (
      shoppingListCopy.map((item, index) => 
      <Chip key={index}  style = {{width:"100%"}}
      backgroundColor = {"#ADD8E6"} onRequestDelete = {(e) => this.deleteFromList(index,e)}>
        <Avatar src = {"https://image.eveonline.com/Type/" + item.typeID + "_32.png"} />
        <span title = {item.name.en}>{App.truncateToLength(item.name.en,20)}&nbsp;|&nbsp;</span>
        <span title = {String(item.regionalPrice)}>{App.largeNumberFormat(item.regionalPrice)}{(item.regionalPrice === undefined||item.regionalPrice === "None")?"":" ISK"}&nbsp;|&nbsp;</span>
        <span title = {String(item.regionalPrice*item.amount)}>{App.largeNumberFormat(item.regionalPrice*item.amount)}{(item.regionalPrice === undefined||item.regionalPrice === "None")?"":" ISK"}&nbsp;|&nbsp;</span>
    <span title = {String(item.volume*item.amount)}>{App.largeNumberFormat(item.volume*item.amount)}{(item.volume === undefined)?"":<span> m<sup>3</sup></span>}&nbsp;|&nbsp;</span>
        <input style={{width:Math.floor(Math.log10(item.amount*10000)) + "ch"}} min = {0} type = {"number"} value = {item.amount} onChange={(event) => this.amountChanger(event,index)}/>
      </Chip>
            )
          )
  }
  //Comparison function for sorting by name.en property
  nameSort = (a,b) => {
    if(a.name.en<b.name.en) {
      return -1;
    }
    if(a.name.en>b.name.en) {
      return 1;
    }
    return 0;
  }
  //Comparison function for sorting by volume property
  volumeSort = (a,b) => {
   return a.volume-b.volume;
  }
  //Truncates string (str) to length indicated by len parameter, used in chips to limit length of item names
  static truncateToLength = (str, len) => {
    if(str.length>len) {
      let subStr = str.substring(0,(len-3));
      return subStr + "...";
    }
    else {
      return str;
    }
  }

  //Formats numbers so that numbers bigger than 1000 will have apropriate SI prefix (k, M)
  //and numbers bigger than 10e9 have ending B (Billion) and 10e12 have ending T (Trillion).
  //Used mostly for formating currency values, also used for volume values (B and T do not really make sense for volumes)
  static largeNumberFormat = (n) => {
    if(!isNaN(n)) {
      let zeroes = Math.floor(Math.log10(n));
      if(zeroes > 2 && zeroes < 6) {
        return (n/1e3).toFixed(2) + " k";
      }
      else if(zeroes > 5 && zeroes < 9) {
        return (n/1e6).toFixed(2) + " M";
      }
      else if(zeroes > 8 && zeroes < 12) {
        return (n/1e9).toFixed(2) + " B";
      }
      else if(zeroes > 11) {
        return (n/1e12).toFixed(2) + " T";
      }
      else return n.toFixed(2);
    }
    else return "Not available";
  }
  //Changes search term
  searchChange = (e) => {
    this.setState({
      search:e.target.value
    })
  }
  //Actually searches using the search term
  search = () => {
    //If search term is empty no filttering is done
    if(this.state.search === "") {
      let a = this.marketGroups
      this.setState({
        result:undefined, 
        filteredMarketGroups:a,
      });
    }
    else {
      //Filters items based on search term
      let found = Object.values(this.types).filter((item) => {
        return item["name"]["en"].toLowerCase().includes(this.state.search.toLowerCase());
      });
      let newGroups = this.filterGroups(found);
      this.setState({
        result:found, 
        filteredMarketGroups:newGroups,
      });
    }
  }
  /*
  Filtters item groups (and subgroups) so that group is not shown if it does not have children.
  Function is used after searching or toggling "show only items available in region" toggle to
  remove extra groups. Sadly groups won't stay in same order as they would naturally be (known bug/feature).
  Parsing is done starting from "leaf" nodes of the tree, unlike in the similar function in Model.js.

  JSON.parse(JSON.stringify(obj)) is used for deep copying the objects because
  all JS copying tools either don't do real deep copies/are slow/are even more hacky than this one.
  Same pattern is used in other functions as well for same reasons.
  */
  filterGroups = (types) => {
    let groups = {};
    //First add groups for each item (type)
    for(let id in types) {
      let type = types[id];
      if(type.marketGroupID in groups) {
        groups[type.marketGroupID].childTypes.push(type.typeID);
      }
      else {
        let group = JSON.parse(JSON.stringify(this.marketGroups[type.marketGroupID]));
        group.childTypes = [type.typeID,];
        groups[type.marketGroupID] = group;
      }
    }
    //then add root group ("None")
    let tmpGroups = {};
    let root = JSON.parse(JSON.stringify(this.marketGroups["None"]));
    root.childGroups = [];
    tmpGroups["None"] = root;
    //Add all the super groups for groups added in first phase
    for(let id in groups) {
      let group = groups[id];
      while(group.hasOwnProperty("parentGroupID")) {
        if(group.parentGroupID in tmpGroups) {
          tmpGroups[group.parentGroupID].childGroups.push(group.marketGroupID);
          break; //Parent was already found in list, so no need to go further
        }
        else {
          let newgroup = JSON.parse(JSON.stringify(this.marketGroups[group.parentGroupID]));
          newgroup.childGroups = [group.marketGroupID,];
          tmpGroups[group.parentGroupID] = newgroup;
          group = newgroup;
        }
      }

    }
    groups = Object.assign(groups,tmpGroups);
    return groups;
  }
//Maps typeIDs from typeList parameter to actual items (types) found from this.types with the given ID
//Returns ist of items (types) that match the type ids or logs to console if the id was not found from this.types
  hideItems = (typeList) => {
    let types = typeList.reduce((res, item) => {
          if(item in this.types) {
            res.push(this.types[item])
          }
          else {
            console.log("Could not find item with ID: " + item + ". Update item database");
          }
          return res;
        },[]);
      let newGroups = this.filterGroups(types);
      this.setState({
        hideUnavailable:true,
        filteredMarketGroups:newGroups});
  }

//Listens for changes in "show only items available in the region" toggle
  toggleHideUnavailable = (bool) => {
    if(bool) {
      this.hideItems(this.regionalTypes);
    }
    else {
      this.setState({
        hideUnavailable:false,
        filteredMarketGroups:this.marketGroups});
    }
  }
//Listens for changes in import/export text field
  textFieldChange = (e) => {
    this.setState({textFieldContent:e.target.value})
  }
  //Parses text field for import, somewhat works for multiple formats available for copying in-game
  //Text exported from the program can be imported aswell (making sharing shopping list easier as the link to shopping list cannot be shared).
  parseTextField = (text) => {
    //Separate lines
    let lines = text.split("\n");
    let regexp = /[\f\n\r\t\v\xA0\u00A0\u2028\u2029]+/;
    let failedToParse = [];
    let items = [];
    //Separate "words" on each line
    for(let i = 0;i<lines.length;i++) {
      lines[i] = lines[i].split(regexp);
    }
    //Find item that matches item name and add amount if amount was found from line.
    //For the parsing to be succesfull the name needs to be the first thing on the lane separated by whitespace (other than regular space).
    //Second thing on the line will be used as amount if it is an integer
    for(let i = 0;i<lines.length;i++) {
      if(lines[i].length>1) {
        let name = lines[i][0];
        let strAmount = lines[i][1];
        let item = Object.values(this.types).find(type => type.name.en === name.trim());
        //Strict parser (almost) copy-pasted from MDN
        let strictParser = (value) => {
          if (/^(\-|\+)?([0-9]+|Infinity)$/.test(value))
            return Number(value);
          return NaN;
        }
        let amount = strictParser(strAmount);
        if(item !== undefined && !isNaN(amount)) {
          let obj = JSON.parse(JSON.stringify(item));
          obj["amount"] = amount;
          items.push(obj);
        }
        else {
          failedToParse.push({line:lines[i],index:i});
        }
      }
      else if(lines[i].length === 1) {
        let item = Object.values(this.types).find(type => type.name.en === lines[i][0].trim());
        if(item !== undefined) {
          let obj = JSON.parse(JSON.stringify(item));
          obj["amount"] = 1;
          items.push(obj);
        }
      }
      else {
        failedToParse.push({line:lines[i], index:i});
      }
    }
    if(failedToParse.length>0) {
      console.log("Failed to parse:" + failedToParse);
    }
    
    return items;
  }

  //Adds the items parsed from the text to end of the list or increments the amount of the item if already found from the list
  mergeImport = () => {
    let items = this.parseTextField(this.state.textFieldContent);
    this.resetPoint();
    let sl = this.state.shoppingList;
    let promiseList = [];
    for(let i = 0;i<items.length;i++) {
      let index = sl.findIndex(o => o.typeID === items[i].typeID);
      if(index>=0) {
        sl[index].amount = sl[index].amount + items[i].amount;
        this.setState({shoppinglist:sl});
      }
      else {
        sl.push(items[i]);
        //Gets regional price infromation for all the added items
        promiseList[i] = this.model.getPrice(items[i].typeID,this.state.selectedRegion).then(res => {
          if(res !== undefined && res[0] !== undefined && res[0].length !== 0) {
            let sorted = res[0].sort((a,b) => a.price-b.price);
            items[i]["regionalPrice"] = sorted[0].price;
          }
          
          else {
            items[i].regionalPrice = undefined;
          }
          return "done"; 
        })
      }
    }
    //All added items are added to shopping list when all the prices are fetched
    Promise.all(promiseList).then(s => this.setState({shoppinglist:sl}));
    
  }

  //Replaces current shopping list with one parsed from text. Essentially the same as above, but starts with empty list instead of this.state.shoppinList.
  replaceImport = () => {
    let items = this.parseTextField(this.state.textFieldContent);
    this.resetPoint();
    let promiseList = [];
    let sl = [];
    for(let i = 0;i<items.length;i++) {
      let index = sl.findIndex(o => o.typeID === items[i].typeID);
      if(index>=0) {
        sl[index].amount = sl[index].amount + items[i].amount;
        this.setState({shoppinglist:sl});
      }
      else {
        sl.push(items[i]);
        promiseList[i] = this.model.getPrice(items[i].typeID,this.state.selectedRegion).then(res => {
          if(res !== undefined && res[0] !== undefined && res[0].length !== 0) {
            let sorted = res[0].sort((a,b) => a.price-b.price);
            items[i]["regionalPrice"] = sorted[0].price;
          }
          
          else {
            items[i].regionalPrice = undefined;
          }
          return "done"; 
        })
        
      }
    }
    Promise.all(promiseList).then(s => this.setState({shoppinglist:sl}));
  }

  //Changes texfield content to formatted text that can be imported in-game, also copies the text to clipboard (if allowed by browser)
  export = () => {
    let text = this.state.shoppingList.map((item) => (
      item.name.en + "\t" + item.amount
    ))
    this.setState({textFieldContent:text.join("\n")},() => {
      let textToCopy = this.textFieldRef;
      textToCopy.focus();
      textToCopy.select();
      try {
        let copied = document.execCommand("copy");
        let msg = (copied) ? "Shopping list copied to clipboard":"Failed to copy shopping list to clipboard";
        this.setState({
          snackbarMessage:msg,
          snackbarOpen:true
        });
      }
      catch (err) {
        console.log("Catched error while copying to clipboard:" + err);
      }
    });
  }
  
  //Undo function
  undo = () => {
    if(this.state.currentStateIndex === this.previousStates.length) {
      this.resetPoint();
      this.setState(this.previousStates[this.state.currentStateIndex-2]);
    }
    else {
      this.setState(this.previousStates[this.state.currentStateIndex-1]);
    }
    
  }
  //Redo function
  redo = () => {
    this.setState(this.previousStates[this.state.currentStateIndex+1]);
  }
  //Creates new point for undo/redo
  resetPoint = () => {
    if(this.state.currentStateIndex === this.previousStates.length) {
      let curState = {shoppingList:JSON.parse(JSON.stringify(this.state.shoppingList)),currentStateIndex:this.state.currentStateIndex};
      this.previousStates.push(curState);
      this.setState({currentStateIndex:curState.currentStateIndex+1})
    }
    else {
       let curState = {shoppingList:JSON.parse(JSON.stringify(this.state.shoppingList)),currentStateIndex:this.state.currentStateIndex};
       this.previousStates = this.previousStates.slice(0,this.state.currentStateIndex);
       this.previousStates.push(curState);
       this.setState({
         currentStateIndex:curState.currentStateIndex+1,
       })
    }
  }
  //Listens for changes in sorting dropdown menu
  changeSort = (e,k,v) => {
    if(v === "Name") {
      this.setState({
        sortBy:v,
        sortFunction:this.nameSort,
      })
    }
    else if(v === "Unit cost") {
      this.setState({
        sortBy:v,
        sortFunction:this.sortPriceData,
      })
    }
    else if(v === "Default") {
      this.setState({
        sortBy:v,
        sortFunction:undefined,
      })
    }
    else if(v === "Volume") {
      this.setState({
        sortBy:v,
        sortFunction:this.volumeSort,
      })
    }
  }


/*
Main render function, could be broken down to smaller renders for cleaner look, then again now its all there and no need to hunt the other renders
apart from some longer ones.
*/
  render() {
    return(
      <MuiThemeProvider>
        <div>
          <div>
            <AppBar title={"EVE Online shopping list"} onLeftIconButtonClick={() => this.setState({ menuOpen: true })} />
            <Drawer open={this.state.menuOpen}
              docked={false}
              onRequestChange={(bool) => this.setState({ menuOpen: bool })}
              containerStyle={{ top: "64px" }}>
              <p>Region</p>
              <DropDownMenu value={this.state.selectedRegion} onChange={this.selectRegion}>
                {this.regions.map((item, i) => (
                  <MenuItem key={i} value={item.id} primaryText={item.name} />
                ))}
              </DropDownMenu>
              <Toggle label={"Show only items available in the region"}
                onToggle={(e, bool) => this.toggleHideUnavailable(bool)} value={this.state.hideUnavailable} />
              <div style={{ display: "flex" }}>
                <RaisedButton label={"Undo"} onClick={this.undo} />
                &nbsp;
              <RaisedButton label={"Redo"} onClick={this.redo} />
              </div>
              <div>
                Sort shopping list by:
               <DropDownMenu value={this.state.sortBy} onChange={this.changeSort} >
                  <MenuItem primaryText="No sorting" value="Default" />
                  <MenuItem primaryText="Name" value="Name" />
                  <MenuItem primaryText="Unit cost" value="Unit cost" />
                  <MenuItem primaryText="Volume" value="Volume" />
                </ DropDownMenu>
                <DropDownMenu value={this.state.sortDirection} onChange={(e, k, v) => this.setState({ sortDirection: v })} >
                  <MenuItem primaryText="Ascending" value="ASC" />
                  <MenuItem primaryText="Descending" value="DESC" />
                </DropDownMenu>
              </div>
              <MenuItem />
            </Drawer>
            <div style={{ display: "flex" }}>
              <Paper style={{ width: "33%", height: window.innerHeight - 100 }}>
                <div>
                  <TextField hintText={"Search..."} value={this.state.search} onChange={this.searchChange} />
                  <RaisedButton label={"Search"} onClick={this.search} />
                </div>
                <div style={{ height: "90%" }}>
                  <MarketTable data={this.state.filteredMarketGroups} types={this.types} conversion={this.iconConversionTable}
                    selectListener={this.selectItem} selected={this.state.selected} />
                </div>
              </Paper>
              <div style={{ width: "30%" }}>
                {this.cardRender()}
                <div>
                  <TextField hintText={"Import/export field"} multiLine={true}
                    fullWidth={true} rows={5} value={this.state.textFieldContent}
                    onChange={this.textFieldChange} ref={(elem) => { this.textFieldRef = elem }} />
                  <RaisedButton label={"Import (merge)"} onClick={this.mergeImport} />
                  <RaisedButton label={"Import (replace)"} onClick={this.replaceImport} />
                  <RaisedButton label={"Export"} style={{ float: "right" }} onClick={this.export} />
                </div>
              </div>

              <Paper styles={{ width: "33%", height: window.innerHeight }}>
                <div>
                  <h4>Name&nbsp;|&nbsp;&nbsp;Unit cost&nbsp;|&nbsp;&nbsp;Total Cost&nbsp;|&nbsp;&nbsp;Total volume&nbsp;|&nbsp;&nbsp;Amount</h4>
                </div>
                <div style={{ maxHeight: '90%', overflow: 'auto' }}>
                  {this.shoppingListRender()}
                </div>
                <ShoppingListInfo data={this.state.shoppingList} />
              </Paper>
            </div>
          </div>
          <Snackbar
            open={this.state.snackbarOpen}
            message={this.state.snackbarMessage}
            autoHideDuration={4000}
            onRequestClose={() => this.setState({ snackbarOpen: false })}
          />
        </div>
      </MuiThemeProvider>
    )
  }
}

//Renders whole market tree shown on the left side of the app
class MarketTable extends Component {
  constructor(props) {
    super(props);
    this.styles = {
      selected:{backgroundColor:"lightblue"}
    }
  }
  //Finds the correct icon from local files or default one if not found
  constructIcon = (id) => {
    let obj = this.props.conversion[id];
    if(obj !== undefined) {
      let splitPath = obj.iconFile.split("/");
      let name = splitPath[(splitPath.length-1)];
      if(name !== "None") {
        //Correct avatars
        
        return <Avatar src = {"Icons/" + name} />
        
        //Used for debuging as the create-react-app server does not really like loading all thousands of icons
        /*
        return <Avatar src = {"Icons/7_64_15.png"} />
        */
        
      }
      else {
        return <Avatar src = {"Icons/7_64_15.png"} />
      }
     
    }
    else {
      return <Avatar src = {"Icons/7_64_15.png"} />
    }
  }
  //Returns the top level of the tree and calls the functions to produce nested content
  listContent = () => {
    if("None" in this.props.data) {
      return this.props.data["None"].childGroups.map((item, i,arr) => (
        <ListItem key = {"not Selectable" + i} value={"not Selectable" + i} primaryTogglesNestedList = {true}
        initiallyOpen = {(arr.length === 1)? true:false}
        primaryText = {this.props.data[String(item)].marketGroupName} 
        nestedItems = {this.nestedContent(item)}
        leftAvatar = {this.constructIcon(this.props.data[item].iconID)} />
      ))
    }
  }
  //Returns the nested content and recursively calls it self to get all the levels of nested content
  nestedContent = (id) => {
    if(this.props.data[id].childGroups.length>0) {
      return this.props.data[id].childGroups.map((item, i, arr) => (
        <ListItem key = {"not Selectable" + i} value={"not Selectable" + i} primaryTogglesNestedList = {true}
        initiallyOpen = {(arr.length === 1)? true:false}
        primaryText = {this.props.data[String(item)].marketGroupName} 
        nestedItems = {this.nestedContent(item)}
        leftAvatar = {this.constructIcon(this.props.data[item].iconID)}/>
      ))
    }
    //Final level of nested content is different from other levels and is mapped here
    else if(this.props.data[id].childTypes.length>0) {
      return this.props.data[id].childTypes.map((item) => (
        <ListItem key = {item} value={item} onClick = {this.props.selectListener}
        primaryText = {(this.props.types[String(item)] === undefined) ? "unknown":this.props.types[String(item)].name.en}
        style = {(item === this.props.selected) ? this.styles.selected:undefined}
        leftAvatar = {<Avatar  src = {"https://image.eveonline.com/Type/" + item + "_32.png"} />}
        />
      ))
    }
  }
  render() {
    return(
       <List style={{maxHeight: '100%', overflow: 'auto'}}>
         {this.listContent()}
      </List>
    )
  }
 
}

//Calculates and renders the totals for the shopping list, could just as well be written to "App" class,
//but it is bloated enough as is.
class ShoppingListInfo extends Component {
  //Sum of volumes (total volume of items in the shopping list)
  volumeSum = () => {
    return this.props.data.reduce((total,item) => {
      return total+(item.volume*item.amount);
    },0);
  }
  //Sum of regional prices (total cost of items in shopping list)
  costSum = () => {
    return this.props.data.reduce((total,item) => {
      return total+((item.regionalPrice === undefined|| item.regionalPrice === "None") ? 0:(item.regionalPrice*item.amount));
    },0);
  }
  render() {
    let vol = this.volumeSum();
    let cost = this.costSum();
    return(
      <Paper>
      <p>Total m<sup>3</sup>:<span title = {String(vol)}>{App.largeNumberFormat(vol)} &nbsp;</span>
      <span title = {String(cost)}>&nbsp; Total cost:{App.largeNumberFormat(cost)}</span></p>
      </Paper>
    )
  }
}

export default App;
