from office365.runtime.auth.user_credential import UserCredential
from office365.sharepoint.client_context import ClientContext

username = "script_automacao@epharma.com.br"
password = "OBPAr8XrTQfCQBG"
server = "https://epharmapbm.sharepoint.com/TI/qualidade"

try:
    ctx = ClientContext(server).with_credentials(
        UserCredential(username, password)
    )

    web = ctx.web
    ctx.load(web)
    ctx.execute_query()

    print("AUTH OK")
    print(web.properties["Title"])

except Exception as e:
    print("AUTH ERROR")
    print(str(e))
