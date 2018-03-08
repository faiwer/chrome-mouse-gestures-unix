(function()
{
	"use strict"; /* global chrome */

	const on = (...args) => document.addEventListener(...args);
	const off = (...args) => document.removeEventListener(...args);
	const autobind = obj =>
	{
		Object
			.getOwnPropertyNames(Object.getPrototypeOf(obj))
			.filter(key => typeof obj[key] === 'function')
			.forEach(key =>
			{
				obj[key] = obj[key].bind(obj);
			});
	};

	const MOD_KEY = 'Control';
	// misc
	const SHIFT_MIN = 50;
	// canvas
	const STROKE_STYLE = 'red';
	const CANVAS_DETTACH_DELAY = 100;

	const CSS = `
		ext-gestures-panel {
			position: fixed;
			padding: 0 100px;
			left: 0;
			top: 30px;
			right: 0;
			display: flex;
			justify-content: center;
			z-index: 99999;
		}
		ext-gestures-arrow {
			display: block;
			flex: 0 0 40px;
			height: 40px;
			border: 1px solid black;
			background: white;
			margin: 0 .5em 0 0;
			outline: 1px solid white;
			line-height: 40px;
			text-align: center;
			color: black;
			font-weight: bold;
			font-size: 20px;
		}
		ext-gestures-arrow[ext-direction="up"]:before    { content: '↑'; }
		ext-gestures-arrow[ext-direction="down"]:before  { content: '↓'; }
		ext-gestures-arrow[ext-direction="right"]:before { content: '→'; }
		ext-gestures-arrow[ext-direction="left"]:before  { content: '←'; }
	`;

	const commands =
	{
		// close tab
		down_right()
		{
			chrome.runtime.sendMessage({ action: 'close-current-tab' });
		},

		// ctrl+shift+T === reopen last closed tab
		left_up()
		{
			chrome.runtime.sendMessage({ action: 'reopen-closed-tab' });
		},

		// reload tab
		down_up()
		{
			window.location.reload();
		},

		// open link in new tab
		down(el)
		{
			const link = el.closest('a');
			const href = link && link.getAttribute('href');
			if(href)
				window.open(href, '_blank');
		}
	};

	const isModeKey = evt =>
	{
		return evt.ctrlKey && evt.shiftKey && evt.altKey;
	};

	const isModeKeyOff = evt =>
	{
		return !evt.ctrlKey || !evt.shiftKey || !evt.altKey;
	};

	class MouseGestures
	{
		constructor(debug)
		{
			autobind(this);

			this._inAction = false;
			this._debug = debug;

			on('keydown', this._onKeyDown);
		}

		_onKeyDown(evt)
		{
			if(!this._inAction && isModeKey(evt))
				this._start();
		}

		_onKeyUp(evt)
		{
			if(isModeKeyOff(evt))
				this._stop();
		}

		_addCSS()
		{
			if(this._cssAdded)
				return;

			this._cssAdded = true;
			setTimeout(() =>
				{
					const style = document.createElement('style');
					style.setAttribute('id', 'ext-gestures-extension-styles');
					style.textContent = CSS;
					document.head.appendChild(style);
				}, 1);
		}

		_start()
		{
			this._inAction = true;

			this._addCSS();

			on('keyup', this._onKeyUp);
			on('mousemove', this._onInitMouseMove, false);
		}

		_onInitMouseMove({ pageX, pageY, target })
		{
			off('mousemove', this._onInitMouseMove, false);

			this._moves = [];
			this._move = null;
			this._x = this._cx = pageX;
			this._y = this._cy = pageY;
			this._target = target;

			setTimeout(() =>
				{
					if(this._inAction)
					{
						this._attachCanvas();
						this._attachPanel();
						on('mousemove', this._onMouseMove, false);
					}
				}, 10);
		}

		_attachPanel()
		{
			this._dettachPanel();

			this._panel = document.createElement('ext-gestures-panel');
			document.body.appendChild(this._panel);
		}

		_dettachPanel()
		{
			if(this._panel)
			{
				this._panel.remove();
				this._panel = null;
			}
		}

		_attachCanvas()
		{
			this._dettachCanvas();

			this._canvas = document.createElement('canvas');
			Object.assign(this._canvas.style,
				{
					top: 0,
					left: 0,
					width: document.body.clientWidth + 'px',
					height: window.innerHeight + 'px',
					position: 'fixed',
					zIndex: 99999,
				});
			Object.assign(this._canvas,
				{
					width: document.body.clientWidth,
					height: window.innerHeight,
				});
			document.body.appendChild(this._canvas);

			// context
			this._ctx = this._canvas.getContext('2d');
			this._ctx.strokeStyle = STROKE_STYLE;
		}

		_dettachCanvas()
		{
			if(this._canvas)
			{
				this._canvas.remove();
				this._canvas = this._ctx = null;
			}
		}

		_stop()
		{
			off('keyup', this._onKeyUp);
			off('mousemove', this._onMouseMove, false);

			this._inAction = false;

			setTimeout(() =>
				{
					this._dettachCanvas();
					this._dettachPanel();

					const target = this._target;
					this._target = null;

					const cmd = commands[action];
					if(cmd)
					{
						this._log(`run cmd for ${action}`)
						cmd(target);
					}
					else this._log(`unknown cmd: ${action}`);
				},
				CANVAS_DETTACH_DELAY);

			const action = this._moves.join('_');
			this._log(`stop: ${action}`);
		}

		_log(msg, ...args)
		{
			if(this._debug)
				console.info(`MG: ${msg}`, ...args);
		}

		_onMouseMove(e)
		{
			this._ctx.moveTo(this._cx, this._cy);
			this._ctx.lineTo(e.pageX, e.pageY);
			this._ctx.stroke();
			this._cx = e.pageX;
			this._cy = e.pageY;

			this._checkPoint(e);
		}

		_checkPoint(e, isFinish)
		{
			const dx = e.pageX - this._x;
			const dy = e.pageY - this._y;

			if(Math.abs(dx) < SHIFT_MIN && Math.abs(dy) < SHIFT_MIN)
				return;

			const aX = dx >= SHIFT_MIN
				? 1
				: (Math.abs(dx) >= SHIFT_MIN ? -1 : 0);
			const aY = dy >= SHIFT_MIN
				? 1
				: (Math.abs(dy) >= SHIFT_MIN ? -1 : 0);

			this._x = e.pageX;
			this._y = e.pageY;

			if(this._move && this._move.aX === aX && this._move.aY === aY)
				return; // not changed current move

			this._move = { aX, aY };
			this._addMove(aX, aY);
		}

		_addMove(aX, aY)
		{
			let direction;
			if(aX !== 0)
				direction = aX > 0 ? 'right' : 'left';
			else
				direction = aY > 0 ? 'down' : 'up';

			this._log(direction);
			this._moves.push(direction);

			const arrow = document.createElement('ext-gestures-arrow');
			arrow.setAttribute('ext-direction', direction);
			this._panel.appendChild(arrow);
		}
	}

	window.mg = new MouseGestures(false);
})();