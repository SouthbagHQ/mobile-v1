#!/bin/bash
# Runner script so i dont need to change settings on the LXC that runs this to update,all i need to do is reboot the lxc
touch /tmp/ItWorked2
uvicorn main:app --reload --port 8000 --host 0.0.0.0