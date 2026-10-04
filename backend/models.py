"""
TSAP Matrimony — DB Models + Pydantic Schemas
Pin-to-Pin Perfect Advanced
"""
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

class Gender(str, Enum):
    Bride = "Bride"
    Groom = "Groom"

class MaritalStatus(str, Enum):
    never_married = "Pelli Kaledu"
    divorced = "Vidakuulu"
    widow = "Widow/Widower"
    handicapped = "Handicapped"

class State(str, Enum):
    TS = "TS"
    AP = "AP"

# Request: Register
class RegisterRequest(BaseModel):
    # Advanced Full Form - All matrimony typical
    full_name: Optional[str] = ""
    gender: Gender
    dob: Optional[str] = ""  # YYYY-MM-DD
    dob_correct: Optional[bool] = False  # Correct DOB tick
    birth_time: Optional[str] = ""  # HH:MM
    age: int = Field(..., ge=18, le=60)
    height: str
    weight: Optional[str] = ""
    blood_group: Optional[str] = ""
    marital_status: MaritalStatus
    physical_status: Optional[str] = "Normal"
    mother_tongue: Optional[str] = "Telugu"
    body_type: Optional[str] = "Average"
    complexion: Optional[str] = ""
    # Family
    father_name: Optional[str] = ""
    father_occupation: Optional[str] = ""
    mother_name: Optional[str] = ""
    mother_occupation: Optional[str] = ""
    family_type: Optional[str] = "Nuclear"
    family_values: Optional[str] = "Traditional"
    family_status: Optional[str] = "Middle Class"
    brothers: Optional[str] = "0"
    brothers_married: Optional[str] = "0"
    sisters: Optional[str] = "0"
    sisters_married: Optional[str] = "0"
    native_place: Optional[str] = ""
    about_family: Optional[str] = ""
    # Astro Caste
    caste: str
    sub_caste: Optional[str] = ""
    gothram: Optional[str] = ""
    star: Optional[str] = ""
    rasi: Optional[str] = ""
    dosham: Optional[str] = "No"
    moola_nakshatram: Optional[str] = "No"
    # Edu Career
    education: str
    education_detail: Optional[str] = ""
    college: Optional[str] = ""
    job: str
    company: Optional[str] = ""
    salary: str
    work_location: Optional[str] = ""
    about_myself: Optional[str] = ""
    # Location Contact
    state: State
    district: str
    mandal: Optional[str] = ""
    current_city: Optional[str] = ""
    pincode: Optional[str] = ""
    phone: str = Field(..., min_length=10, max_length=15)
    email: Optional[str] = ""
    referral_code: Optional[str] = ""
    photo_private: bool = False
    expectations: Optional[str] = ""
    # Expectations Builder JSON
    exp_age_min: Optional[str] = ""
    exp_age_max: Optional[str] = ""
    exp_height_min: Optional[str] = ""
    exp_height_max: Optional[str] = ""
    exp_caste: Optional[str] = ""
    exp_job: Optional[str] = ""
    exp_location: Optional[str] = ""

class UserDB(BaseModel):
    id: int
    tsap_id: str  # TSAP-M-2025-1042
    gender: Gender
    age: int
    height: str
    marital_status: MaritalStatus
    caste: str
    sub_caste: str
    gothram: str
    star: str
    education: str
    job: str
    salary: str
    state: State
    district: str
    mandal: str
    phone_encrypted: str
    phone_last4: str
    referral_code: str
    referred_by: Optional[str] = ""  # who referred this user
    photo_urls: List[str]
    card_url: str
    is_verified: bool = False
    is_approved: bool = False
    privacy_mode: str = "public"  # public / private
    credits: int = 3
    plan: str = "FREE"  # FREE, S_99, S_199, S_299, S_499, BUREAU_999, BUREAU_2999
    plan_expiry: Optional[datetime] = None
    source_channel: Optional[str] = ""  # deep link source
    created_at: datetime = Field(default_factory=datetime.utcnow)
    score_boost: int = 0  # premium gets boost

class MatchResult(BaseModel):
    matched_user_id: str
    observations: List[str] = Field(default_factory=list)
    is_paid_unlock: bool = False
    is_sent: bool = False

class CreditTransaction(BaseModel):
    user_id: str
    change: int  # +10, -1
    reason: str  # "PAY_99", "VIEW_NUMBER", "REFERRAL_BONUS", "ADMIN_GIFT"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ReferralCommission(BaseModel):
    referrer_code: str  # TSAP-REF-1042 or BROKER-xxx
    referred_user_id: str
    amount: int  # 20 or 30
    type: str  # USER, BROKER, BUREAU
    status: str = "PENDING"  # PENDING, PAID
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PaymentDB(BaseModel):
    id: str
    user_id: str
    amount: int
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = ""
    status: str  # CREATED, PAID, FAILED
    credits_added: int
    verified_at: Optional[datetime] = None

class ChannelPost(BaseModel):
    id: int
    user_tsap_id: str
    channel_username: str  # @ts_brides, @tsap_reddy, @tsap_second
    telegram_message_id: Optional[int] = None
    posted_at: datetime = Field(default_factory=datetime.utcnow)
    post_type: str = "NEW"  # NEW, BOOST, TOP_OF_DAY

# For API responses
class RegisterResponse(BaseModel):
    tsap_id: str
    card_url: str
    credits: int
    message_telugu: str
    # 🔐 WAVE 9 — auth token (private API IDOR fix) + privacy/clarity fields
    auth_token: str = ""
    phone_masked: str = ""
    phone_verified: bool = False
    is_approved: bool = False
    duplicate_phone: bool = False
    quality: Optional[Dict[str, Any]] = None
    message_plan_telugu: str = ""
    next_steps: List[str]
    auto_post_queue: List[str]
    top_3_matches: List[MatchResult]
    # Candidate destinations and approval-gated publish queue status; queue does not confirm delivery.
    publish_queued: bool = False
    publish_targets: List[str] = []
    publish_reason: str = "awaiting_profile_approval"
    namaste_queued: bool = False
    welcome_status: Optional[Dict[str, Any]] = None
    share_kit: Optional[Dict[str, Any]] = None
    share_text: str = ""
    # 🤝 Referral 2.0 — mee sontha code/link + friend code nunchi vachina bonus
    referral: Optional[Dict[str, Any]] = None
    # 🎁 WAVE 10 — register avvagane WhatsApp ki velle "3 profiles + caste channel links" pack
    welcome_pack: Optional[Dict[str, Any]] = None

class SearchResponse(BaseModel):
    profile: UserDB
    can_view_number: bool
    credits_needed: int
    observations: List[str] = Field(default_factory=list)
    differences: List[str] = Field(default_factory=list)
    preference_checks: List[Dict[str, Any]] = Field(default_factory=list)
    is_photo_blur: bool
