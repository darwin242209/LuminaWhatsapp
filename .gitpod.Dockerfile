# Use the official Gitpod base image
FROM gitpod/workspace-full

# Install libatk and other necessary dependencies
RUN sudo apt-get update \
    && sudo apt-get install -y libatk1.0-0 libgtk-3-0
