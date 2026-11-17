import json,urllib.request
B="http://127.0.0.1:8000"
def names(q): return sorted(r["full_name"] for r in json.load(urllib.request.urlopen(B+"/api/search?gender=bride"+q))["results"])
print("all:",len(names("")),"| photo,id:",names("&verification_level=photo,id"),"| id:",names("&verification_level=id"))
