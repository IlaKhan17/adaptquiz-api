from tests.conftest import register, upload


def _generate(client, headers, doc_id, **extra):
    resp = client.post(
        "/api/v1/quiz/generate",
        headers=headers,
        json={"doc_id": doc_id, "num_questions": 3, **extra},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _answer(client, headers, session_id, question_id, answer):
    resp = client.post(
        "/api/v1/eval/answer",
        headers=headers,
        json={"session_id": session_id, "question_id": question_id, "student_answer": answer},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_quiz_never_exposes_answer_key(client, auth):
    doc = upload(client, auth)
    quiz = _generate(client, auth, doc["doc_id"])

    fetched = [
        quiz,
        client.get(f"/api/v1/quiz/{quiz['quiz_id']}", headers=auth).json(),
        client.get(f"/api/v1/session/{quiz['session_id']}/quiz", headers=auth).json(),
    ]
    for payload in fetched:
        for q in payload["questions"]:
            assert "correct_answer" not in q
            assert "explanation" not in q
            assert "source_chunk" not in q
            for opt in q["options"] or []:
                assert set(opt) == {"label", "text"}


def test_full_quiz_flow(client, auth):
    doc = upload(client, auth)
    quiz = _generate(client, auth, doc["doc_id"], topic="Calvin cycle")
    assert quiz["total_questions"] == 3
    mcq, tf, short = quiz["questions"]
    sid = quiz["session_id"]

    # MCQ is graded directly and reports which option was right
    wrong = _answer(client, auth, sid, mcq["question_id"], "A")
    assert wrong["is_correct"] is False
    assert wrong["correct_option_label"] == "B"
    right = _answer(client, auth, sid, mcq["question_id"], "b")  # re-answering overwrites
    assert right["is_correct"] is True
    assert right["score"] == 1.0

    # True/false is graded directly
    assert _answer(client, auth, sid, tf["question_id"], "false")["is_correct"] is True

    # Short answer goes through the (stubbed) LLM rubric
    graded = _answer(client, auth, sid, short["question_id"], "It makes food")
    assert graded["score_percentage"] == 40
    assert len(graded["rubric_feedback"]) == 3

    report = client.get(f"/api/v1/session/{sid}/report", headers=auth).json()
    assert report["answered"] == 3
    assert report["correct_count"] == 2
    assert report["overall_score"] == 0.8
    assert report["grade"] == "A"
    assert report["knowledge_gaps"] == [{"topic": "energy conversion", "frequency": 1}]

    sessions = client.get("/api/v1/session", headers=auth).json()
    assert sessions[0]["session_id"] == sid
    assert sessions[0]["answered"] == 3
    assert sessions[0]["overall_score"] == 0.8

    quizzes = client.get("/api/v1/quiz", headers=auth).json()
    assert quizzes[0]["quiz_id"] == quiz["quiz_id"]
    assert quizzes[0]["session_id"] == sid
    assert quizzes[0]["doc_filename"] == "notes.txt"


def test_unanswered_session_lists_without_score(client, auth):
    doc = upload(client, auth)
    quiz = _generate(client, auth, doc["doc_id"])
    sessions = client.get("/api/v1/session", headers=auth).json()
    item = next(s for s in sessions if s["session_id"] == quiz["session_id"])
    assert item["answered"] == 0
    assert item["overall_score"] is None
    assert item["grade"] is None


def test_curriculum_is_passed_to_prompt(client, auth, fake_llm):
    doc = upload(client, auth)
    _generate(client, auth, doc["doc_id"], curriculum="AP Biology")
    assert "CURRICULUM: AP Biology" in fake_llm[-1]


def test_users_cannot_access_each_others_data(client, auth):
    doc = upload(client, auth)
    quiz = _generate(client, auth, doc["doc_id"])
    other = register(client)

    assert client.get(f"/api/v1/quiz/{quiz['quiz_id']}", headers=other).status_code == 404
    assert client.get(f"/api/v1/session/{quiz['session_id']}/report", headers=other).status_code == 404
    assert client.get(f"/api/v1/session/{quiz['session_id']}/quiz", headers=other).status_code == 404
    assert (
        client.post("/api/v1/quiz/generate", headers=other, json={"doc_id": doc["doc_id"]}).status_code
        == 404
    )
    resp = client.post(
        "/api/v1/eval/answer",
        headers=other,
        json={
            "session_id": quiz["session_id"],
            "question_id": quiz["questions"][0]["question_id"],
            "student_answer": "B",
        },
    )
    assert resp.status_code == 404
    assert client.get("/api/v1/documents", headers=other).json() == []


def test_unknown_document(client, auth):
    resp = client.post("/api/v1/quiz/generate", headers=auth, json={"doc_id": "nope"})
    assert resp.status_code == 404


def test_num_questions_bounds(client, auth):
    doc = upload(client, auth)
    for n in (0, 16):
        resp = client.post(
            "/api/v1/quiz/generate", headers=auth, json={"doc_id": doc["doc_id"], "num_questions": n}
        )
        assert resp.status_code == 422
