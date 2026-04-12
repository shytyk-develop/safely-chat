from pydantic import BaseModel
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

# Base message schema
class MessageBase(BaseModel):
    content: str

# Request schema for creating a new message
class MessageCreate(MessageBase):
    receiver_id: int

# Response schema returned for messages
class MessageResponse(MessageBase):
    id: int
    sender_id: int
    receiver_id: int
    timestamp: datetime
    is_read: bool

    class Config:
        from_attributes = True
