from fastapi import APIRouter

router = APIRouter(prefix="/courses", tags=["courses"])

@router.get("/")
def get_courses_stub():
    return {"message": "Courses endpoint stub"}
