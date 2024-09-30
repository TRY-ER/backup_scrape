# Use the official Python 3.11 image as the base
FROM python:3.11-slim-buster

# Install required packages
RUN apt-get update && apt-get install -y wget unzip gnupg2

# Download and install Google Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - 
RUN sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'

RUN apt-get update

RUN apt-get install google-chrome-stable -y

# Install Selenium and other dependencies
RUN pip install selenium requests uvicorn fastapi beautifulsoup4

# Copy your project files
COPY ./serve /app

# Set the working directory to the project directory
WORKDIR /app

# Run the application using uvicorn on port 6993
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "6993"]