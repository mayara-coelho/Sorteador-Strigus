#!/bin/bash

docker build -t sorteador-strigus .
docker container stop sorteador
docker container rm sorteador
docker run --name sorteador -p 5000:5000 sorteador-strigus