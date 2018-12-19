#!/bin/bash

ETC_DIR="/root/ipfs.etc"
LOG_FILE="${ETC_DIR}/ipfs.log"
ISON_FILE="${ETC_DIR}/IPFS_IS_ON"

#
# parse command line
#
# --check  => check to ensure that we are still running
# --stop   => stop any running instance
# no parms => interactive
#
DO_STOP=""
DO_CHECK=""
DO_FORCE=""
while [ $# -gt 0 ]; do
    case "$1" in
	--check)         DO_CHECK="t";;
	--stop)          DO_STOP="t";;
	--force)         DO_FORCE="t";;
	*)               echo "invalid cmd line option"; exit;;
    esac
    shift
done

pid=$(ps -ef | grep "ipfs daemon" | grep -v grep | awk ' { print $2 } ')

#
# stop
#
if [ -n "$DO_STOP" ]; then
    rm -f "${ISON_FILE}"
    if [ -n "$pid" ]; then
	kill -INT $pid
	sleep 5
    else
	echo "ipfs daemon does not seem to be running"
    fi
    exit
fi


#
# check
#
if [ -n "$DO_CHECK" ]; then
    if [ -e "${ISON_FILE}" ]; then
	if [ -z "$pid" ]; then
	    echo "ipfs daemon is not running! retstarting now!"
	    nohup ipfs daemon >> ${LOG_FILE} 2>&1 &
	    sleep 1
	fi
    fi
    exit
fi


#
# interactive
#
if [ -n "$pid" ]; then
    echo "ipfs daemon is running.... ctl-c to exit.... enter to restart"
    read x
    echo "sending TERM..."
    kill -TERM $pid
    pid=$(ps -ef | grep "ipfs daemon" | grep -v grep | awk ' { print $2 } ')
    sleep 1
    while [ -n "$pid" ]; do
	echo "ipfs daemon is still running.... wait 30 sec..."
	sleep 30
	pid=$(ps -ef | grep "ipfs daemon" | grep -v grep | awk ' { print $2 } ')
	if [ -n "$DO_FORCE" ]; then
	    echo "ipfs daemon is still running.... sending KILL..."
	    kill -KILL $pid
	    sleep 1
	    pid=$(ps -ef | grep "ipfs daemon" | grep -v grep | awk ' { print $2 } ')
	fi
    done
    echo "ipfs daemon has stopped"
fi
pid=$(ps -ef | grep "ipfs daemon" | grep -v grep | awk ' { print $2 } ')
if [ -n "$pid" ]; then
    echo "ipfs daemon is still running... don't know what to do..."
    exit
fi
echo "$(date): starting ipfs daemon" > ${ISON_FILE}
nohup ipfs daemon >> ${LOG_FILE} 2>&1 &
sleep 1
echo "(re)started ipfs daemon"
