from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "taskflow"
    db_password: str = "taskflow"
    db_name: str = "notifications_db"
    port: int = 8004

    model_config = {"env_file": ".env"}


settings = Settings()
