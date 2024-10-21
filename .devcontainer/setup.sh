#!/bin/bash

# clone required repositories
git clone https://github.com/Azure/azure-cli.git
git clone https://github.com/Azure/azure-cli-extensions.git

git clone https://github.com/Azure/azure-rest-api-specs.git
git clone https://github.com/Azure/azure-rest-api-specs-pr.git

git clone https://github.com/Azure/aaz.git

# setup azure-cli environment
pip install azdev
azdev setup -c ./azure-cli -r ./azure-cli-extenions

# run codegen tool
pip install aaz-dev
aaz-dev run -c ./azure-cli -e ./azure-cli-extensions -s ../azure-rest-api-specs -a ../aaz
