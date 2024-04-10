import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/meta")
async def meta():
    with open("meta.json", encoding="utf-8") as fp:
        meta = json.load(fp)
    return meta


@app.get("/assignment/{user}")
async def assignment_get(user: str):
    assignment = []
    if not os.path.exists(f"assignment/{user}.json"):
        return []
    with open(f"assignment/{user}.json", encoding="utf-8") as fp:
        assignment = json.load(fp)
    return assignment


@app.get("/submit/{user}")
async def submit_get(user: str):
    submit = []
    if not os.path.exists(f"submit/{user}.json"):
        return []
    with open(f"submit/{user}.json", encoding="utf-8") as fp:
        submit = json.load(fp)
    return submit


class UserPayload(BaseModel):
    id: str
    answer: str


@app.post("/submit/{user}")
async def submit_post(user: str, payload: UserPayload):
    submit = []
    if os.path.exists(f"submit/{user}.json"):
        with open(f"submit/{user}.json", encoding="utf-8") as fp:
            submit = json.load(fp)

    found_flag = False
    for s in submit:
        if s["id"] == payload.id:
            s["answer"] = payload.answer
            found_flag = True
            break

    if not found_flag:
        submit.append({"id": payload.id, "answer": payload.answer})

    with open(f"submit/{user}.json", "w", encoding="utf-8") as fp:
        json.dump(submit, fp, indent=2)

    return submit


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
