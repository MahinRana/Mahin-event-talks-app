# BigQuery Release Notes Hub & Social Hub

A premium, glassmorphic dark-theme web application built with **Python Flask** and **Vanilla HTML, CSS, and JavaScript**. This application aggregates official Google Cloud BigQuery release notes from the XML Atom feed, filters them dynamically, and lets users easily compose and publish updates to Twitter/X.

## 🚀 Features

- **Automated XML Parsing**: Fetches and segments the official GCP BigQuery Atom feed in real-time.
- **Vibrant Glassmorphic UI**: High-end dark theme featuring radial glows, backdrop-filters, custom scrollbars, and hover micro-animations.
- **Dynamic Search & Filtering**: Instant, client-side keyword searching and category sorting (Features, Issues, Deprecations, General).
- **Direct Tweeting**: Single-click "Tweet" button on every release card to generate pre-formatted templates.
- **Combined/Bulk Tweeting**: Multi-select cards via custom checkboxes. A floating bottom action tray aggregates your selections into a single summarized tweet.
- **Interactive Tweet Composer**: Includes:
  - An editable text area with automatic character countdown (280-character limit).
  - A **circular progress counter** powered by Conic gradients that changes color from Indigo to Orange and Red as you approach the character limit.
  - A **live Twitter card preview** that mimics the layout on Twitter/X in real-time.

## 🛠️ Technology Stack

- **Backend**: Python 3.12, Flask
- **Frontend**: Vanilla HTML5, CSS3 (Custom variables, glassmorphism), ES6+ JavaScript
- **Icons & Typography**: FontAwesome CDN, Google Fonts (Outfit & Inter)

## 📁 Directory Structure

```text
bigquery-release-notes/
├── app.py              # Flask server and XML parser
├── templates/
│   └── index.html      # Main page template
├── static/
│   ├── css/
│   │   └── style.css   # Custom styles and animations
│   └── js/
│       └── app.js      # State, rendering, and Tweet Composer logic
├── .gitignore          # Git exclusion file
└── README.md           # Documentation
```

## ⚙️ Setup and Installation

### Prerequisites
- Python 3.12+ installed.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MahinRana/Mahin-event-talks-app.git
   cd Mahin-event-talks-app
   ```

2. **Install dependencies**:
   ```bash
   pip install flask
   ```

3. **Run the application**:
   ```bash
   python app.py
   ```

4. **Access the application**:
   Open your browser and navigate to `http://127.0.0.1:5000`.

## 📖 How It Works

1. **XML Parsing**: The Flask backend uses Python's native `xml.etree.ElementTree` to parse the Atom feed at `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`. It splits the HTML body of each entry (separated by `<h3>` tags) into distinct objects representing individual updates.
2. **Text Cleaning**: To prepare text for Twitter, a regex parses HTML tags and decodes entities into clean plain-text descriptions.
3. **Twitter Web Intent**: Rather than posting directly via API (which requires developers keys/access), the application uses the official **Twitter Web Intent** protocol (`https://twitter.com/intent/tweet?text=...`) to route users to Twitter securely with pre-composed content.
