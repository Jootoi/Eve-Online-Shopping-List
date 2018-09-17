from zipfile import ZipFile
from yaml import load
from json import dump
from shutil import rmtree
import iconCulling
import argparse

def groupsParser(path, childTypes):
    print("groupsParser started...")
    #load data
    with open(path) as f:
        data = load(f)
        print("data loaded...")
        childID = {}
        #Get child groups of all item groups
        for item in data:
            parentID = item.get("parentGroupID", None)
            if parentID != None:
                arr = childID.get(parentID, [])
                arr.append(item["marketGroupID"])
                childID[parentID] = arr
            else:
                item["parentGroupID"] = "None"
                arr = childID.get("None",[])
                arr.append(item["marketGroupID"])
                childID["None"] = arr
        #Reshape list to dictionary and add child groups/types
        finalData = {}
        #Add "None" as placeholder for 'root' parentID
        finalData["None"] = {}
        n = finalData["None"]
        n["childGroups"] = childID["None"]
        for group in data:
            groupID = group["marketGroupID"]
            mapping = childID.get(groupID, [])
            group["childGroups"] = mapping

            mapping = childTypes.get(groupID, [])
            group["childTypes"] = mapping
            finalData[groupID] = group
        print("dumping total of {} market categories to json...".format(len(finalData)))
        with open('public/market_groups.json','w') as wf:
            dump(finalData,wf, indent=4, separators=(',',': '))

def typesParser(path):
    print("typesParser starting...")
    with open(path) as f:
        data = load(f)
        print("loaded...")
        relevant = {}
        childTypes = {}
        for k, v in data.items():
            parentGroup = v.get("marketGroupID", None)
            name = v.get("name", {})
            nameExist = "en" in name
            if(parentGroup != None and nameExist):
                relevant[k] = v
                relevant[k]["typeID"] = k
                arr = childTypes.get(parentGroup, [])
                arr.append(k)
                childTypes[parentGroup] = arr
        print("dumping list of {} types/items to json...".format(len(relevant)))
        with open('public/market_types.json','w') as wf:
            dump(relevant,wf, indent=4, separators=(',',': '))
        return childTypes

def iconsParser(path):
    print("IconsParser starting...")
    with open(path) as f:
        data = load(f)
        print("dumping...")
        with open('public/icons.json','w') as wf:
            dump(data,wf, indent=4, separators=(',',': '))
        return data

def regionParser(path):
    print("regionParser starting...")
    with open(path) as f:
        data = load(f)
        regions = list(filter(lambda x: x["groupID"] == 3, data))
        #rename keys
        renamed_regions = []
        for region in regions:
            renamed = {"name": region["itemName"], "id": region["itemID"]}
            renamed_regions.append(renamed)
        print("dumping...")
        with open("public/regions.json","w") as wf:
            dump(renamed_regions, wf, indent= 4, separators=(',',': '))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize flat files from static data export")
    parser.add_argument("sde_name", type = str, help = "Name or path of static data export .zip file")
    parser.add_argument("icon_pack_name", type = str, help = "Name or path of static (image) data export .zip file")
    parser.add_argument("-exclude_regions", action="store_true", help="Excludes regions from parsing (it takes long and regions rarely change)")
    args = parser.parse_args()
    iconPath = args.icon_pack_name
    path = args.sde_name

    with ZipFile(path, "r") as sde:
        type_path = sde.extract("sde/fsd/typeIDs.yaml")
        groups_path = sde.extract("sde/bsd/invMarketGroups.yaml")
        icons_path = sde.extract("sde/fsd/iconIDs.yaml")
        regions_path = sde.extract("sde/bsd/invUniqueNames.yaml")

        
        iconData = iconsParser(icons_path)
        childT = typesParser(type_path)
        groupsParser(groups_path, childT)
        if not args.exclude_regions:
            regionParser(regions_path)
        else:
            print("Skipped generating regions.json")
        iconCulling.extract_icons(iconPath, iconData)
    
    #Clean up
    print("Cleaning up...")
    rmtree("./sde")