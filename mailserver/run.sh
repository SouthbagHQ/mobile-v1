#!/bin/bash
# Runner script so i dont need to change settings on the LXC that runs this to update,all i need to do is reboot the lxc
uvicorn main:app --reload --port 8000