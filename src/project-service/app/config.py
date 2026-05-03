from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "taskflow"
    db_password: str = "taskflow"
    db_name: str = "projects_db"
    port: int = 8002

    model_config = {"env_file": ".env"}


settings = Settings()

