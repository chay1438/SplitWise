@echo off
if not exist docs mkdir docs
if exist *.md move *.md docs\
if not exist scripts mkdir scripts
if exist *.bat move *.bat scripts\
if exist create_colors.js move create_colors.js scripts\
if exist fix_build_versions.js move fix_build_versions.js scripts\
if exist project.tar.gz del project.tar.gz
