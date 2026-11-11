"""Standalone VADER sentiment service."""
import os
from flask import Flask, jsonify
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

app = Flask(__name__)
analyzer = SentimentIntensityAnalyzer()


@app.get('/')
@app.get('/health')
def health():
    return jsonify(status='ok', service='VADER sentiment analyzer')


@app.get('/analyze/<path:input_txt>')
def analyze_sentiment(input_txt):
    if len(input_txt) > 4000 or not input_txt.strip():
        return jsonify(error='Provide between 1 and 4000 characters.'), 400
    scores = analyzer.polarity_scores(input_txt)
    compound = scores['compound']
    label = 'positive' if compound >= 0.05 else 'negative' if compound <= -0.05 else 'neutral'
    return jsonify(sentiment=label, scores=scores)


if __name__ == '__main__':
    from waitress import serve
    serve(app, host=os.getenv('HOST', '127.0.0.1'), port=int(os.getenv('PORT', '5050')))
