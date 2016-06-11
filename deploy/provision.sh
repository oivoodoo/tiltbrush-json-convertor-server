#!/bin/sh

ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook provision.yml -i hosts
