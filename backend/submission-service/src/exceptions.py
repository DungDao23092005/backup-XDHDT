class PaperNotFoundError(Exception):
    """Lỗi khi không tìm thấy bài báo trong DB"""
    pass

class NotAuthorizedError(Exception):
    """Lỗi khi user cố truy cập bài báo không phải của mình"""
    pass

class StateTransitionError(Exception):
    """Lỗi khi cố chuyển trạng thái bài báo không hợp lệ"""
    pass

# File: src/exceptions.py

class BaseError(Exception):
    """Lớp lỗi cơ sở cho ứng dụng"""
    def __init__(self, message: str):
        self.message = message

class PaperNotFoundError(BaseError):
    pass

class AuthorNotFoundError(BaseError):
    pass

class NotAuthorizedError(BaseError):
    """Lỗi khi user không phải là chủ sở hữu bài báo"""
    pass

class BusinessRuleError(BaseError):
    """Lỗi vi phạm quy tắc nghiệp vụ (VD: Trùng email, bài đã đóng...)"""
    pass

class BusinessRuleError(Exception):
    def __init__(self, message: str):
        self.message = message

class DeadlineExceededError(BusinessRuleError):
    """Lỗi ném ra khi quá hạn nộp bài"""
    pass

class BusinessRuleError(Exception):
    """Lỗi vi phạm quy tắc nghiệp vụ chung"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

class PaperNotFoundError(Exception):
    """Lỗi không tìm thấy bài báo"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)