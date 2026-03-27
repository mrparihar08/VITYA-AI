def handle_info_request(message: str):
    text = (message or "").lower().strip()

    if "report" in text:
        return {"type": "text", "content": "Report feature is coming soon!"}

    if "advice" in text:
        return {"type": "text", "content": "Financial advice feature is coming soon!"}

    if "help" in text:
        return {
            "type": "text",
            "content": (
                "You can tell me things like 'I spent 200 on food' or "
                "'I earned 5000 salary'. You can also ask for totals like "
                "'What is my total expense?'"
            ),
        }

    if "category" in text:
        return {
            "type": "text",
            "content": (
                "I can categorize your transactions into Food, Transport, "
                "Entertainment, Utilities, Health, Salary, Shopping, and Housing "
                "based on keywords in your message."
            ),
        }

    if "feedback" in text:
        return {
            "type": "text",
            "content": "We value your feedback! Please email us at feedback@vitya.com",
        }

    if "contact" in text:
        return {
            "type": "text",
            "content": "You can contact our support team at support@vitya.com",
        }

    if "about" in text:
        return {
            "type": "text",
            "content": (
                "vitya is your personal finance assistant. I can help you track "
                "your expenses and income just by chatting with me!"
            ),
        }

    if "thanks" in text or "thank you" in text:
        return {
            "type": "text",
            "content": "You're welcome! I'm here to help you manage your finances.",
        }

    if "greet" in text or "hello" in text or "hi" in text:
        return {
            "type": "text",
            "content": "Hello! I'm vitya, your personal finance assistant. How can I help you today?",
        }

    if "bye" in text or "goodbye" in text:
        return {
            "type": "text",
            "content": "Goodbye! Have a great day managing your finances!",
        }

    if "joke" in text:
        return {
            "type": "text",
            "content": "Why don't scientists trust atoms? Because they make up everything!",
        }

    if "quote" in text:
        return {
            "type": "text",
            "content": "The best way to get started is to quit talking and begin doing. - Walt Disney",
        }

    if "motivation" in text:
        return {
            "type": "text",
            "content": "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
        }

    if "weather" in text:
        return {
            "type": "text",
            "content": "I can't check the weather yet, but I hope it's sunny where you are!",
        }

    if "holiday" in text:
        return {
            "type": "text",
            "content": "I hope you have a wonderful holiday! Remember to budget for it!",
        }

    if "goal" in text:
        return {
            "type": "text",
            "content": "Setting financial goals is a great way to stay motivated! What are your goals?",
        }

    if "challenge" in text:
        return {
            "type": "text",
            "content": "Here's a financial challenge for you: Try to save 10% of your income this month!",
        }

    return None