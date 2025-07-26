import os
import logging
from tempfile import mkdtemp
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify, session, flash, redirect, url_for
from werkzeug.utils import secure_filename
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
import uuid
import stripe
import json
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import io
import base64
from datetime import datetime
from models import db, User, CVUpload, AnalysisResult
from forms import LoginForm, RegistrationForm, UserProfileForm, ChangePasswordForm
from utils.pdf_extraction import extract_text_from_pdf
from utils.openrouter_api import (
    optimize_cv, generate_recruiter_feedback,
    generate_cover_letter, analyze_job_url,
    ats_optimization_check, generate_interview_questions,
    analyze_cv_strengths, analyze_cv_score,
    analyze_keywords_match, check_grammar_and_style,
    optimize_for_position, generate_interview_tips
)
from utils.rate_limiter import rate_limit
from utils.encryption import encryption
from utils.security_middleware import security_middleware
from utils.notifications import notification_system
from utils.analytics import analytics
from utils.cv_validator import cv_validator


# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Enhanced session security
app.config.update(
    SESSION_COOKIE_SECURE=True,  # HTTPS only
    SESSION_COOKIE_HTTPONLY=True,  # No JavaScript access
    SESSION_COOKIE_SAMESITE='Lax',  # CSRF protection
    PERMANENT_SESSION_LIFETIME=timedelta(hours=24)  # Session timeout
)

# Database configuration
database_url = os.environ.get('DATABASE_URL')
if not database_url:
    # Fallback to SQLite for development
    database_url = 'sqlite:///cv_optimizer.db'
    logger.warning("Using SQLite database for development")

# Fix for PostgreSQL URL compatibility
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
    'pool_timeout': 20,
    'pool_size': 10,
    'max_overflow': 20
}

# Initialize extensions
db.init_app(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Zaloguj się, aby uzyskać dostęp do tej strony.'
login_manager.login_message_category = 'info'

# Initialize security middleware
security_middleware.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# Stripe configuration
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

# Configuration for file uploads
UPLOAD_FOLDER = mkdtemp()
ALLOWED_EXTENSIONS = {'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def add_watermark_to_cv(cv_text):
    """
    Dodaj znak wodny do CV dla niepłacących użytkowników
    """
    watermark = "\n\n" + "="*60 + "\n"
    watermark += "🔒 WERSJA DEMO - CV OPTIMIZER PRO\n"
    watermark += "Aby otrzymać pełną wersję CV bez znaku wodnego,\n"
    watermark += "dokonaj płatności 9,99 PLN\n"
    watermark += "="*60 + "\n"

    # Dodaj znak wodny na początku i na końcu
    watermarked_cv = watermark + cv_text + watermark

    return watermarked_cv

def parse_ai_json_response(ai_result):
    """
    Parse JSON response from AI, handling various formats
    """
    import json
    try:
        logger.debug(f"AI result before parsing: {ai_result[:200]}...")

        # Clean AI result - remove markdown formatting if present
        clean_result = ai_result
        if '```json' in clean_result:
            json_start = clean_result.find('```json') + 7
            json_end = clean_result.find('