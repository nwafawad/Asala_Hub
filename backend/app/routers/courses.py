from fastapi import APIRouter

router = APIRouter(prefix="/courses", tags=["courses"])

@router.get("")
@router.get("/")
def courses_placeholder():
    return {"message": "Courses router stub"}
