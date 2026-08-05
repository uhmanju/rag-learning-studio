import re


class _PromptValue:
    def __init__(self, text):
        self._text = text
        self.content = text

    def to_string(self):
        return self._text


class _InnerPrompt:
    def __init__(self, template):
        self.template = template


class _Message:
    def __init__(self, template):
        self.prompt = _InnerPrompt(template)


class ChatPromptTemplate:
    def __init__(self, template):
        self._template = template
        self.messages = [_Message(template)]

    @classmethod
    def from_template(cls, template):
        return cls(template)

    def invoke(self, values: dict):
        text = self._template
        for key, value in values.items():
            text = re.sub(r"\{" + re.escape(key) + r"\}", lambda _m, v=value: str(v), text)
        return _PromptValue(text)
