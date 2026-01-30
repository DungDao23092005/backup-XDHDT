import os
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import List

# 1. Định nghĩa cấu trúc dữ liệu đầu ra mong muốn (Schema)
class AIReviewResponse(BaseModel):
    synopsis: str = Field(description="A neutral summary of the paper")
    key_points: List[str] = Field(description="List of 3-5 key extraction points (claims/methods)")

class AIReviewerService:
    def __init__(self):
        # Lấy API Key Google từ biến môi trường
        api_key = os.getenv("GOOGLE_API_KEY")
        
        # Nếu không có key, chạy chế độ Mock
        self.is_mock = not api_key
        
        if not self.is_mock:
            # 👇 Cấu hình Gemini
            # Sử dụng 'gemini-1.5-flash' vì bạn đã cập nhật thư viện mới.
            # Nó nhanh hơn và ổn định hơn bản Pro cũ.
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash", 
                temperature=0.3,
                google_api_key=api_key
                # Đã xóa tham số 'convert_system_message_to_human' vì thư viện mới không cần nữa
            )
            self.parser = JsonOutputParser(pydantic_object=AIReviewResponse)

    def analyze_paper_abstract(self, title: str, abstract: str):
        """
        Phân tích Abstract dùng Gemini
        """
        if self.is_mock:
            print("⚠️ No Google API Key found. Using Mock data.")
            return self._get_mock_response()

        # 2. Tạo Prompt (Gemini hiểu prompt này rất tốt)
        prompt_template = PromptTemplate(
            template="""
            You are an expert AI Assistant for an Academic Conference Reviewer.
            Your task is to provide a neutral synopsis and extract key points from the following paper abstract.

            Paper Title: {title}
            Abstract: {abstract}

            Output must be a valid JSON object with the following keys:
            - "synopsis": A 3-4 sentence neutral summary of the paper (in Vietnamese if the input is Vietnamese, otherwise English).
            - "key_points": A list of 3-5 bullet points covering main claims or methods.

            {format_instructions}
            """,
            input_variables=["title", "abstract"],
            partial_variables={"format_instructions": self.parser.get_format_instructions()},
        )

        # 3. Tạo Chain: Prompt -> Gemini -> Parser JSON
        chain = prompt_template | self.llm | self.parser
        
        try:
            result = chain.invoke({"title": title, "abstract": abstract})
            return result
        except Exception as e:
            print(f"🔥 Gemini AI Error: {e}")
            # Nếu lỗi (ví dụ hết quota, lỗi mạng) thì trả về Mock để app không chết
            return self._get_mock_response()

    def _get_mock_response(self):
        """Dữ liệu giả để test khi không có mạng hoặc lỗi API"""
        return {
            "synopsis": "[Mock] Bài báo này đề xuất kiến trúc Microservices sử dụng Gemini AI để hỗ trợ Reviewer. Tác giả tập trung vào việc tích hợp LangChain để xử lý ngôn ngữ tự nhiên.",
            "key_points": [
                "Tích hợp Google Gemini 1.5 Flash vào hệ thống chấm bài.",
                "Sử dụng LangChain để parser dữ liệu JSON.",
                "Giảm thời gian đọc bài của Reviewer xuống 40%."
            ]
        }

# Singleton instance (để import ở nơi khác dùng luôn)
ai_service = AIReviewerService()