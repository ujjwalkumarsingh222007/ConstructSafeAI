import pytest
from datetime import datetime, timezone
from bson import ObjectId
from app.database import mongodb, check_db_connection
from app.models.objectid import PyObjectId
from app.models.mongodb import (
    UserDocument,
    ProjectDocument,
    PPEDetectionDocument,
    DetectionBox,
    RoleDocument,
)

@pytest.mark.asyncio
async def test_mongodb_connection_and_ping():
    result = await check_db_connection()
    assert isinstance(result, dict)
    assert result["connected"] is True
    assert result["engine"] == "MongoDB Community (PyMongo Async)"
    assert result["database"] == "constructsafe_db"
    assert isinstance(result["latency_ms"], float)
    assert result["latency_ms"] >= 0

@pytest.mark.asyncio
async def test_objectid_serialization_and_validation():
    # Test valid ObjectId string
    raw_id = "507f1f77bcf86cd799439011"
    oid = PyObjectId.validate(raw_id)
    assert isinstance(oid, ObjectId)
    assert str(oid) == raw_id

    # Test invalid string raises ValueError
    with pytest.raises(ValueError):
        PyObjectId.validate("invalid_hex_string")

    # Test Role model serialization
    role = RoleDocument(
        name="safety_inspector",
        display_name="Safety Inspector",
        description="Inspects PPE compliance and hazards",
        permission_names=["inspections:read", "inspections:write", "detections:verify"]
    )
    dumped = role.model_dump(by_alias=True)
    assert isinstance(dumped["_id"], ObjectId)
    
    dumped_json = role.model_dump_json(by_alias=True)
    assert '"_id":' in dumped_json
    assert str(role.id) in dumped_json

@pytest.mark.asyncio
async def test_mongodb_document_crud_operations():
    """Verify async insertion, query, and retrieval with PyMongo AsyncMongoClient."""
    await mongodb.connect()
    assert mongodb.db is not None
    db = mongodb.db

    test_collection = db["test_verification_collection"]
    
    # 1. Insert document
    test_doc = {
        "_id": ObjectId(),
        "project_code": "PRJ-TEST-001",
        "name": "Tower Alpha Verification",
        "active": True,
        "compliance_target": 95.5,
        "created_at": datetime.now(timezone.utc)
    }
    insert_result = await test_collection.insert_one(test_doc)
    assert insert_result.inserted_id == test_doc["_id"]

    # 2. Retrieve document
    fetched = await test_collection.find_one({"project_code": "PRJ-TEST-001"})
    assert fetched is not None
    assert fetched["name"] == "Tower Alpha Verification"
    assert fetched["compliance_target"] == 95.5

    # 3. Update document
    update_result = await test_collection.update_one(
        {"_id": test_doc["_id"]},
        {"$set": {"active": False, "compliance_target": 98.0}}
    )
    assert update_result.modified_count == 1

    # 4. Verify updated state
    updated_doc = await test_collection.find_one({"_id": test_doc["_id"]})
    assert updated_doc is not None
    assert updated_doc["active"] is False
    assert updated_doc["compliance_target"] == 98.0

    # 5. Clean up test document
    delete_result = await test_collection.delete_one({"_id": test_doc["_id"]})
    assert delete_result.deleted_count == 1

@pytest.mark.asyncio
async def test_complex_document_with_embedded_models():
    """Verify insertion and schema validation of PPE detection document with embedded bounding boxes."""
    await mongodb.connect()
    assert mongodb.db is not None

    detection_doc = PPEDetectionDocument(
        camera_id=PyObjectId(),
        project_id=PyObjectId(),
        timestamp=datetime.now(timezone.utc),
        detected_persons_count=2,
        has_violation=True,
        detections=[
            DetectionBox(class_name="helmet", confidence=0.96, box=[0.1, 0.2, 0.4, 0.5]),
            DetectionBox(class_name="vest", confidence=0.92, box=[0.1, 0.3, 0.5, 0.8]),
        ],
        missing_items=["safety_gloves"]
    )

    doc_data = detection_doc.model_dump(by_alias=True)
    insert_res = await mongodb.db.ppe_detections.insert_one(doc_data)
    assert insert_res.inserted_id == detection_doc.id

    fetched_raw = await mongodb.db.ppe_detections.find_one({"_id": detection_doc.id})
    assert fetched_raw is not None
    
    # Validate into Pydantic model
    validated_model = PPEDetectionDocument.model_validate(fetched_raw)
    assert validated_model.id == detection_doc.id
    assert validated_model.has_violation is True
    assert len(validated_model.detections) == 2
    assert validated_model.detections[0].class_name == "helmet"
    assert validated_model.missing_items == ["safety_gloves"]

    # Clean up test entry
    await mongodb.db.ppe_detections.delete_one({"_id": detection_doc.id})
