FROM registry.access.redhat.com/ubi9/ubi:latest AS base

ARG USER_NAME=default
ARG USER_ID=1001
ARG GROUP_ID=1001
ARG HOME=/home/${USER_NAME}

ENV USER_NAME=${USER_NAME}
ENV USER_ID=${USER_ID}
ENV GROUP_ID=${GROUP_ID}
ENV HOME=${HOME}

ENV container=oci

USER root

COPY .nvmrc .nvmrc

# Check for package update
RUN dnf -y update-minimal --security --sec-severity=Important --sec-severity=Critical && \
    # Install git, nano
    dnf install git gcc make  gcc-c++ unzip nano -y; \
    # clear cache
    dnf clean all


# Install Deno and required packages
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh; \
deno install --allow-scripts=npm:@parcel/watcher@2.5.1,npm:lmdb@3.2.6,npm:msgpackr-extract@3.0.3

# Add NodeSource repository and install latest Node.js LTS
RUN curl -fsSL https://rpm.nodesource.com/setup_lts.x | bash - && \
    dnf install -y nodejs && \
    dnf clean all

# Verify Node.js and npm installation
RUN node -v && npm -v
RUN npm install -g esbuild


WORKDIR ${HOME}

RUN echo -${USER_NAME} ${GROUP_ID}-

# Create user and set permissions
RUN groupadd -g ${GROUP_ID} ${USER_NAME} && \
    useradd -u ${USER_ID} -r -g ${USER_NAME} -d ${HOME} -s /sbin/nologin ${USER_NAME} && \
    chown -R ${USER_NAME}:${USER_NAME} ${HOME} && \
    chmod -R 0750 ${HOME}

# Install uv, latest python and ruff 
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="${HOME}/.local/bin" sh
# Make sure uv is available in PATH
ENV PATH="${HOME}/.local/bin:${PATH}"
RUN uv tool install ruff@latest

# Dev target
FROM base AS dev
COPY .devcontainer/devtools.sh /tmp/devtools.sh
RUN chmod +x /tmp/devtools.sh
RUN  /tmp/devtools.sh
USER default

# DEPLOYMENT EXAMPLE:
#-----------------------------

# # Prod target
# FROM base

# ## CD into App folder, copy project from host to /app
# WORKDIR ${HOME}

# ## REPLACE: replace this COPY statement with project specific files/folders
# COPY . .

# # Check home
# RUN chown -R default:default ${HOME} && \
#     chmod -R 0750 ${HOME}

# USER ${USER_NAME}

# ## Install project requirements, build project
# RUN uv venv && \
#     source .venv/bin/activate && \
#     uv pip install .

# ## Expose port and run app
# EXPOSE 8080

# #for uvicorn (FastAPI)
# CMD [ "sh", "-c", "uv run fastapi run src/main.py --port 8080 --workers 4 --host 0.0.0.0" ]