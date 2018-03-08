# Mouse gestures exension for Chrome for OSX & Linux

Linux & OSX users can't easily use any gesture extensions in Chrome, because these OS work with keyboard differently (to Windows). Originally in old Opera with presto engine user need to move his mouse with pressed right mouse button for performing any gesture. But in Chrome in OSX & Linux this behavior blocks context menu mechanism.

This extensions tries to solve this problem by weird way. You need:

- mouse with extra unused buttons (e.g. any a4tech mouse)
- have a configuration software for this mouse
- set up on any of its unused buttons the keyboard shortcut `ctrl+alt+shift`
- install this extension

# How it works

This extensions assumes that when you click and hold that unused mouse button, your mouse send to OS the keyboard shortcut `ctrl+al+shift` instead of default its behavior. The extension subscribes on keyboard `onkeydown` event and listens for that shortcut. When this shortcut has provided the extension starts draw-gesture mode.