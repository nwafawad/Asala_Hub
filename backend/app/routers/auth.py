from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("")
@router.get("/")
def auth_placeholder():
    return {"message": "Authentication router stub"}
