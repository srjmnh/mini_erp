# HR ERP System

A modern, AI-powered HR ERP system built with Flask, Firebase, AWS services, and Google's Gemini AI.

## Features

- 🔐 **Secure Authentication**
  - Firebase Authentication integration
  - Role-based access control
  - Split-screen modern login UI

- 👥 **Employee Management**
  - Complete employee lifecycle management
  - Document management
  - Leave management
  - Department and role management

- 📊 **Attendance System**
  - Facial recognition using AWS Rekognition
  - Real-time attendance tracking
  - Attendance reports and analytics
  - Late arrival and early departure tracking

- 📁 **Document Center**
  - Secure document storage with AWS S3
  - Document categorization and tagging
  - Version control
  - Access control and sharing
  - Document expiry notifications

- 💬 **AI HR Assistant**
  - Powered by Google's Gemini AI
  - Policy and procedure inquiries
  - Document analysis
  - Smart suggestions
  - Context-aware responses

- 🎨 **Modern UI/UX**
  - Google Material Design inspired interface
  - Responsive layout
  - Dark/Light mode support
  - Intuitive navigation
  - Mobile-friendly design

## Tech Stack

- **Backend**: Python Flask
- **Authentication**: Firebase Auth
- **Database**: Firebase Realtime Database
- **Storage**: AWS S3
- **AI Services**:
  - AWS Rekognition for facial recognition
  - Google Gemini for AI assistant
- **Frontend**:
  - HTML5/CSS3
  - JavaScript
  - Google Material Icons
  - Google Fonts

## Prerequisites

1. Python 3.8+
2. Firebase account and project
3. AWS account with S3 and Rekognition access
4. Google Cloud project with Gemini API access

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd erp-project
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with your credentials:
   ```env
   # Flask
   FLASK_APP=app.py
   FLASK_ENV=development
   SECRET_KEY=your-secret-key

   # Firebase
   FIREBASE_ADMIN_CREDENTIALS_BASE64=your-base64-encoded-credentials

   # AWS
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=your-region
   AWS_S3_BUCKET=your-bucket-name

   # Google Gemini
   GEMINI_API_KEY=your-api-key
   ```

5. Initialize the Firebase Admin SDK:
   ```python
   # The credentials will be loaded from the environment variable
   ```

6. Run the application:
   ```bash
   flask run
   ```

## Project Structure

```
erp-project/
├── app.py                 # Main application file
├── requirements.txt       # Python dependencies
├── .env                  # Environment variables
├── README.md             # Project documentation
├── routes/               # API routes
│   ├── auth.py          # Authentication routes
│   ├── employees.py     # Employee management routes
│   ├── attendance.py    # Attendance system routes
│   ├── documents.py     # Document management routes
│   └── chat.py          # AI assistant routes
├── static/              # Static files
│   ├── css/            # Stylesheets
│   ├── js/             # JavaScript files
│   └── img/            # Images and icons
└── templates/           # HTML templates
    ├── base.html       # Base template
    ├── login.html      # Login page
    └── dashboard.html  # Main dashboard
```

## Security Considerations

1. All credentials should be stored in environment variables
2. Implement rate limiting for API endpoints
3. Regular security audits and updates
4. Proper error handling and logging
5. Input validation and sanitization
6. CORS configuration
7. SSL/TLS encryption

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact [support@email.com](mailto:support@email.com)

## Acknowledgments

- Google Material Design
- Firebase team
- AWS Services
- Flask community
