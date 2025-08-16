Generate a daily health insight for this user based on their data.

**User Profile:**
- Age: {{age}}
- Sex: {{sex}}
- Height: {{height_in}} inches
- Goals: {{goals}}

**Today's Metrics:**
{{today_metrics}}

**Recent Trends (7-day averages):**
{{recent_trends}}

**30-day Weight Trend:**
{{weight_trend}}

**Last 3 Days Summary:**
{{last_3_days}}

**Context:**
- Focus on positive progress and achievable next steps
- Consider the user's goals and patterns
- Provide specific, actionable advice
- Keep the tone encouraging and supportive
- Remember this is informational guidance only, not medical advice

**Output Format (JSON):**
```json
{
  "summary": "A concise, encouraging summary of today's health status and progress (max 120 words)",
  "actions": [
    "Specific, actionable step 1",
    "Specific, actionable step 2", 
    "Specific, actionable step 3"
  ],
  "risk_flags": [
    "Any concerning patterns that warrant attention (optional)"
  ]
}
```

**Guidelines:**
- Summary should be motivational and highlight progress
- Actions should be specific and achievable today/tomorrow
- Risk flags should be gentle observations, not alarming
- Keep everything non-medical and informational
