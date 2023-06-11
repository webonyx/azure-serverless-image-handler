# syntax = docker/dockerfile:latest

# To enable ssh & remote debugging on app service change the base image to the one below
# FROM mcr.microsoft.com/azure-functions/node:4-node18-appservice
FROM mcr.microsoft.com/azure-functions/node:4-node18 as builder

COPY source /source

RUN cd /source/image-handler && \
    npm ci

RUN cd /source/azure-functions && \
    npm ci \
    && npm run build \
    && npm prune --production

FROM mcr.microsoft.com/azure-functions/node:4-node18-appservice

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    AzureWebJobsFeatureFlags=EnableWorkerIndexing \
    AUTO_WEBP=Yes \
    AWS_REGION=us-east-1

COPY --link --from=builder /source/azure-functions/node_modules /home/site/wwwroot/node_modules

COPY --link --from=builder /source/azure-functions/dist /home/site/wwwroot/dist

COPY --link source/azure-functions/package.json source/azure-functions/host.json /home/site/wwwroot/
