import requests

username = "script_automacao@epharma.com.br"

url = "https://login.microsoftonline.com/GetUserRealm.srf"

params = {
    "login": username,
    "xml": "1"
}

r = requests.get(url, params=params)

print(r.text)
