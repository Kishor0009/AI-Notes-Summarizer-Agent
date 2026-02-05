import httpx
from fastapi import HTTPException

# Public App ID provided by user
INSTANT_APP_ID = "a4ede1af-d538-4007-b058-4a2a33f52401"

async def verify_instant_token(refresh_token: str):
    """
    Verifies the InstantDB refresh token.
    Returns the user info if valid, raises HTTPException otherwise.
    """
    url = "https://api.instantdb.com/runtime/auth/verify_refresh_token"
    payload = {
        "app-id": INSTANT_APP_ID,
        "refresh-token": refresh_token
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            print(f"[DEBUG] InstantDB Auth Response: {data}") # Log the response
            
            # Handle potential nested 'user' key
            if "user" in data:
                return data["user"]
            return data
        except httpx.HTTPStatusError as e:
            with open("error.log", "a") as f:
                f.write(f"InstantDB Auth Error: {e.response.text}\n")
            print(f"InstantDB Auth Error: {e.response.text}")
            raise HTTPException(status_code=401, detail="Invalid authentication token.")
        except Exception as e:
            with open("error.log", "a") as f:
                f.write(f"InstantDB Verification Failed: {str(e)}\n")
            print(f"InstantDB Verification Failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Authentication service unavailable.")
