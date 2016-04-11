(function()
{
	"use strict"; /* global chrome */

	// buttons
	const LEFT = 0;
	const RIGHT = 2;
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
		ext-gestures-arrow[ext-direction="left"]:before { content: '←'; }
	`;

	const commands =
		{
			// close tab
			'down-right'()
			{
				chrome.runtime.sendMessage({ action: 'close-current-tab' });
			},

			'left-up'()
			{
				chrome.runtime.sendMessage({ action: 'reopen-closed-tab' });
			},

			// reload tab
			'down-up'(){ window.location.reload(); },

			// // open link in new tab
			// 'down'(el)
			// {
			// 	while(el && el.tagName !== 'A')
			// 		el = el.parentElement;
			// 	if(!el || el.tagName !== 'A')
			// 		return;

			// 	const href = el.getAttribute('href');
			// 	if(!href)
			// 		return;

			// 	window.open(href, '_blank');
			// }
		};

	class MouseGestures
	{
		constructor(debug)
		{
			document.addEventListener('mousedown', e => { this._onMouseDown(e); }, false);
			document.addEventListener('mouseup', e => { this._onMouseUp(e); }, false);
			document.addEventListener('contextmenu', e => { this._onContext(e); }, false);
			this._onMouseMove = this._onMouseMove.bind(this);
			this._debug = debug;

			this._addCSS();
		}

		_addCSS()
		{
			setTimeout(() =>
				{
					const style = document.createElement('style');
					style.setAttribute('id', 'ext-gestures-extension-styles');
					style.textContent = CSS;
					document.head.appendChild(style);
				}, 1);
		}

		_onMouseDown(e)
		{
			if(this._inAction)
			{
				this._stop();
				return;
			}

			if(e.button === LEFT)
				this._left = true;
			else if(e.button === RIGHT && !this._left)
			{
				let el = e.target;
				while(el && el.tagName !== 'IMG' && el.tagName !== 'A')
					el = el.parentElement;
				if(!el || (el.tagName !== 'IMG' && el.tagName !== 'A'))
					this._start(e);
			}
		}

		_onMouseUp(e)
		{
			if(e.button === LEFT)
				this._left = false;
			else if(e.button === RIGHT && this._inAction)
				this._stop(e);
		}

		_onContext(e)
		{
			if(this._inAction)
			{
				if(!e.ctrlKey && !e.shiftKey && !e.altKey)
					e.preventDefault();
				else
					this._stop();
			}
			this._log('_onContext');
		}

		_start(e)
		{
			this._inAction = true;
			e.preventDefault();
			document.addEventListener('mousemove', this._onMouseMove, false);

			this._moves = [];
			this._move = null;
			this._x = this._cx = e.pageX;
			this._y = this._cy = e.pageY;
			this._target = e.target;

			setTimeout(() =>
				{
					this._attachCanvas();
					this._attachPanel();
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
					position: 'absolute',
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

		_stop(e)
		{
			setTimeout(() =>
				{
					this._dettachCanvas();
					this._dettachPanel();

					const cmd = commands[action];
					if(cmd)
						cmd(this._target);
				}, CANVAS_DETTACH_DELAY);

			document.removeEventListener('mousemove', this._onMouseMove, false);
			this._inAction = false;

			const action = this._moves.join('-');
			this._log(`stop: ${action}`);
		}

		_log(msg, ...args)
		{
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

			const aX = dx >= SHIFT_MIN ? 1 : (Math.abs(dx) >= SHIFT_MIN ? -1 : 0);
			const aY = dy >= SHIFT_MIN ? 1 : (Math.abs(dy) >= SHIFT_MIN ? -1 : 0);

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