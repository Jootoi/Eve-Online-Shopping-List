import os
from shutil import rmtree
from json import load
from zipfile import ZipFile
import argparse

def extract_icons(path, required_icons):
    print("Starting icon extraction...")
    with ZipFile(path, "r") as sde:
        icon_list = sde.namelist()
        icon_list_ending = []
        could_not_find = 0
        #Get only file name, not whole path
        for key in icon_list:
            icon_list_ending.append(key.split("/")[-1].lower())
        required_names = []
        full_names = []
        #Get only file name, not whole path
        for key in required_icons:
            required_names.append(required_icons[key]["iconFile"].split("/")[-1].lower())
        #Find matching names and get full path name for matched image names
        for name in required_names:
            try:
                ind = icon_list_ending.index(name,0,len(icon_list_ending))
                full_names.append(icon_list[ind])
            except ValueError:
                could_not_find += 1
        print("Found {} matches between database and image files, could not find matches for {} cases in database and {} images were discarded"
        .format(len(full_names), could_not_find, len(icon_list)-len(full_names)))
        #Extract matched images
        for name in full_names:
            sde.extract(name)
            os.rename(name,"public/Icons/"+name.split("/")[-1])
        #Clean up
        file_list = os.listdir("public/Icons")
        rmtree("Icons/")
        print("Extracted {} images, moved them to public/Icons/".format(len(file_list)))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extracts necessary image files from SDE image files")
    parser.add_argument("icon_pack_name", type = str, help = "Name or path of static (image) data export .zip file")
    path = parser.parse_args().icon_pack_name

    with open("icons.json") as f:
        data = load(f)
    extract_icons(path,data)
    

