#!/bin/bash

docker run -d -p 6379:6379 --name redis redis
docker container start redis
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' redis