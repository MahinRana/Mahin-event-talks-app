from flask import Flask, jsonify, render_template, request
import urllib.request
import xml.etree.ElementTree as ET
import re
from datetime import datetime

app = Flask(__name__)

FEED_URL = 'https://docs.cloud.google.com/feeds/bigquery-release-notes.xml'

def parse_html_content(html_str):
    """
    Parses the Atom entry HTML content, which typically consists of
    <h3>Type</h3> followed by paragraph/list contents, and returns
    a list of dictionaries of parsed updates.
    """
    # Split content by <h3>Type</h3>
    parts = re.split(r'<h3>(.*?)</h3>', html_str)
    updates = []
    
    if len(parts) > 1:
        for i in range(1, len(parts), 2):
            update_type = parts[i].strip()
            update_content = parts[i+1].strip() if i+1 < len(parts) else ''
            
            # Clean up empty paragraphs or trailing/leading whitespace
            update_content = re.sub(r'^\s*<p>&nbsp;</p>\s*$', '', update_content)
            
            # Stripped description for tweeting (plain text)
            # Remove HTML tags to make it suitable for plain text tweet
            plain_text = re.sub(r'<[^>]+>', '', update_content)
            plain_text = re.sub(r'\s+', ' ', plain_text).strip()
            # Unescape common XML entities
            plain_text = plain_text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
            
            updates.append({
                'type': update_type,
                'content_html': update_content,
                'content_text': plain_text
            })
    else:
        # Fallback if there are no <h3> tags
        plain_text = re.sub(r'<[^>]+>', '', html_str)
        plain_text = re.sub(r'\s+', ' ', plain_text).strip()
        plain_text = plain_text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
        
        updates.append({
            'type': 'General',
            'content_html': html_str,
            'content_text': plain_text
        })
        
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        req = urllib.request.Request(FEED_URL, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
        })
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', namespaces):
            title = entry.find('atom:title', namespaces).text
            updated_str = entry.find('atom:updated', namespaces).text
            
            link_elem = entry.find('atom:link[@rel="alternate"]', namespaces)
            if link_elem is None:
                link_elem = entry.find('atom:link', namespaces)
            link = link_elem.attrib.get('href') if link_elem is not None else ''
            
            content_elem = entry.find('atom:content', namespaces)
            content = content_elem.text if content_elem is not None else ''
            
            updates = parse_html_content(content)
            
            try:
                # Parse ISO timestamp and format beautifully
                dt = datetime.fromisoformat(updated_str)
                formatted_date = dt.strftime('%B %d, %Y')
            except Exception:
                formatted_date = title
            
            entries.append({
                'date': formatted_date,
                'raw_date': updated_str,
                'link': link,
                'updates': updates
            })
            
        return jsonify({
            'success': True,
            'releases': entries,
            'fetched_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
