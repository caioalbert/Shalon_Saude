from office365.runtime.auth.user_credential import UserCredential
from office365.sharepoint.client_context import ClientContext

username = "script_automacao@epharma.com.br"
password = "OBPAr8XrTQfCQBG"

url = "https://epharmapbm.sharepoint.com/TI/qualidade"

ctx = ClientContext(url).with_credentials(
    UserCredential(username, password)
)

web = ctx.web
ctx.load(web)
ctx.execute_query()

print(web.properties["Title"])
