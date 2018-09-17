class Model {
    constructor() {
        this.regions = [];
        this.marketGroups = {};
        this.types = {};
        this.prices = [];
        this.listeners = [];
        this.iconConversionTable = {};
        this.regionalPrices = [];
        this.regionalTypes = [];
        this.parseRegions();
        this.parseMarketGroups();
        this.getIcons();
        this.parseTypes();
    }

    parseMarketGroups = () => {
        let a = this;
        fetch('market_groups.json')
        .then(response => response.json())
        .then(data => a.marketGroups = data)
        .then(() => this.fireChange("groups"))
        .catch(err => console.log(err))
    }

    parseTypes = () => {
        let a = this;
        fetch('market_types.json')
        .then(response => response.json())
        .then(data => a.types = data)
        .then(() => this.fireChange("types"))
        .catch(err => console.log(err))
    }

    getIcons = () => {
        let a = this;
        fetch('icons.json')
        .then(response => response.json())
        .then(data => a.iconConversionTable = data)
        .then(() => this.fireChange("icons"))
        .catch(err => console.log(err))
    }

    //Fetch items (types) available in the region defined by regionID parameter from ESI
    fetchRegionalTypes = (regionID) => {
        let a = this;
        this.regionalTypes = [];
        //get number of pages from header of (probably) empty page
        fetch("https://esi.evetech.net/latest/markets/"+regionID+"/types/?datasource=tranquility&page="+100)
        .then(response => response.headers.get("x-pages"))
        .then(pages => {
            let promiseArray = [];
            for(let i = 1;i<=pages;i++) {
                //Fetch all the pages and push promises to array
                promiseArray.push(fetch("https://esi.evetech.net/latest/markets/"+regionID+"/types/?datasource=tranquility&page="+i));
            }
            Promise.all(promiseArray)
            .then(responses => {
                let jsonPromiseArray = responses.map(response => response.json());
                Promise.all(jsonPromiseArray)
                .then(jsonArray => {
                    for(let i = 0;i<jsonArray.length;i++) {
                        a.regionalTypes = a.regionalTypes.concat(jsonArray[i]);
                    }
                    a.regionalTypes = [...new Set(a.regionalTypes)];
                    return "regional_types";
                })
                .then(string => a.fireChange(string));
            })
        
        })          
    }
    //Parses region names/IDs from (server) local JSON file
    parseRegions = () => {
        let a = this;
        fetch('regions.json')
        .then(response => response.json())
        .then(regions => a.regions=regions)
        .then(() => a.fireChange("regions"));
    }
    
    //Working with listeners
    addOnChangeListener = (l) => {
        this.listeners.push(l);
    }
    fireChange = (s) => {
        for(let i = 0;i<this.listeners.length;i++) {
            this.listeners[i](s);
        }
    }

    getRegions = () => {
        return this.regions;
    }
    getMarketGroups = () => {
        return this.marketGroups;
    }
    getTypes = () => {
        return this.types;
    }
    getPrices = () => {
        return this.prices;
    }
    getIconConversionTable = () => {
        return this.iconConversionTable;
    }
    getRegionalTypes = () => {
        return this.regionalTypes;
    }
    //Gets regional price data from EVE Online Swagger Interface (ESI), returns promises of JSON objects
    getPrice = (id,region) => {
        if(this.regionalTypes.indexOf(id) > -1) {
            return fetch("https://esi.evetech.net/latest/markets/" + region + "/orders/?datasource=tranquility&order_type=sell&page=1&type_id="+id)
            .then(r => r.headers.get("x-pages"))
            .then(pages => {
                let promiseArray = [];
            for(let i = 1;i<=pages;i++) {
                promiseArray.push(fetch("https://esi.evetech.net/latest/markets/" + region + "/orders/?datasource=tranquility&order_type=sell&page="+i+"&type_id="+id));
            }
            return Promise.all(promiseArray)   
            })
            .then(responses => Promise.all(responses.map(response => response.json())))
        }
        else return Promise.resolve(undefined);
    }
}
export default Model;