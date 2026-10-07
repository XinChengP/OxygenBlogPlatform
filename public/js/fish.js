var RENDERER = {
	POINT_INTERVAL : 5,
	FISH_COUNT : 3,
	MAX_INTERVAL_COUNT : 50,
	INIT_HEIGHT_RATE : 0.5,
	THRESHOLD : 50,
	// resize 防抖间隔。原实现引用了未定义的 this.WATCH_INTERVAL（等于 0ms），
	// 防抖实际失效，拖动窗口时会立即反复重建画布；现补上真实间隔
	WATCH_INTERVAL : 200,

	init : function(){
		// 关键修复：动画循环一旦启动就永不停止（render 内部持续 requestAnimationFrame），
		// 若不先取消旧循环，重复调用 init（例如页脚组件卸载后重新挂载）会让
		// render 每帧执行次数 +1，小鱼状态推进速度成倍加快，且越积越快。
		// 因此 init 的第一步永远是停掉可能存在的旧循环，保证全局只有一条渲染循环。
		if(this.rafId){
			cancelAnimationFrame(this.rafId);
			this.rafId = 0;
		}
		this.setParameters();
		this.reconstructMethods();
		this.setup();
		this.bindEvent();
		this.render();
	},
	setParameters : function(){
		// 原实现基于 jQuery，现为等价的原生 DOM 操作
		this.container = document.getElementById('jsi-flying-fish-container');
		// 若容器里已残留旧画布（重复初始化的场景），先移除，避免画布层层堆叠
		var oldCanvas = this.container.querySelector('canvas');
		if(oldCanvas){
			oldCanvas.remove();
		}
		this.canvas = document.createElement('canvas');
		this.container.appendChild(this.canvas);
		this.context = this.canvas.getContext('2d');
		this.points = [];
		this.fishes = [];
		this.watchIds = [];
	},
	createSurfacePoints : function(){
		var count = Math.round(this.width / this.POINT_INTERVAL);
		this.pointInterval = this.width / (count - 1);
		this.points.push(new SURFACE_POINT(this, 0));
		
		for(var i = 1; i < count; i++){
			var point = new SURFACE_POINT(this, i * this.pointInterval),
				previous = this.points[i - 1];
				
			point.setPreviousPoint(previous);
			previous.setNextPoint(point);
			this.points.push(point);
		}
	},
	reconstructMethods : function(){
		// window 级监听器不会随容器 DOM 销毁而移除，重复 init 前必须先解绑旧的，
		// 否则 resize 监听器会越积越多（bind 每次生成新引用，不解绑就永远移除不掉）
		if(this.boundWatchWindowSize){
			window.removeEventListener('resize', this.boundWatchWindowSize);
		}
		this.watchWindowSize = this.watchWindowSize.bind(this);
		// 保存绑定后的引用，供下次 init 时解绑使用
		this.boundWatchWindowSize = this.watchWindowSize;
		this.jdugeToStopResize = this.jdugeToStopResize.bind(this);
		this.startEpicenter = this.startEpicenter.bind(this);
		this.moveEpicenter = this.moveEpicenter.bind(this);
		this.reverseVertical = this.reverseVertical.bind(this);
		this.render = this.render.bind(this);
	},
	setup : function(){
		this.points.length = 0;
		this.fishes.length = 0;
		this.watchIds.length = 0;
		this.intervalCount = this.MAX_INTERVAL_COUNT;
		// 容器无 padding/border，getBoundingClientRect 与 jQuery.width() 取值一致
		var rect = this.container.getBoundingClientRect();
		this.width = rect.width;
		this.height = rect.height;
		this.fishCount = this.FISH_COUNT * this.width / 500 * this.height / 500;
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.reverse = false;

		this.fishes.push(new FISH(this));
		this.createSurfacePoints();
	},
	watchWindowSize : function(){
		this.clearTimer();
		this.tmpWidth = document.documentElement.clientWidth;
		this.tmpHeight = document.documentElement.clientHeight;
		this.watchIds.push(setTimeout(this.jdugeToStopResize, this.WATCH_INTERVAL));
	},
	clearTimer : function(){
		while(this.watchIds.length > 0){
			clearTimeout(this.watchIds.pop());
		}
	},
	jdugeToStopResize : function(){
		var width = document.documentElement.clientWidth,
			height = document.documentElement.clientHeight,
			stopped = (width == this.tmpWidth && height == this.tmpHeight);
			
		this.tmpWidth = width;
		this.tmpHeight = height;
		
		if(stopped){
			this.setup();
		}
	},
	bindEvent : function(){
		window.addEventListener('resize', this.watchWindowSize);
		this.container.addEventListener('mouseenter', this.startEpicenter);
		this.container.addEventListener('mousemove', this.moveEpicenter);
	},
	/*
		光标相对容器的坐标。
		原实现 clientX - offset().left + scrollLeft() 中 scroll 相互抵消，
		等价于视口坐标之差，因此直接用 getBoundingClientRect：
		x = clientX - rect.left, y = clientY - rect.top
	*/
	getAxis : function(event){
		var rect = this.container.getBoundingClientRect();

		return {
			x : event.clientX - rect.left,
			y : event.clientY - rect.top
		};
	},
	startEpicenter : function(event){
		this.axis = this.getAxis(event);
	},
	moveEpicenter : function(event){
		var axis = this.getAxis(event);
		
		if(!this.axis){
			this.axis = axis;
		}
		this.generateEpicenter(axis.x, axis.y, axis.y - this.axis.y);
		this.axis = axis;
	},
	generateEpicenter : function(x, y, velocity){
		if(y < this.height / 2 - this.THRESHOLD || y > this.height / 2 + this.THRESHOLD){
			return;
		}
		var index = Math.round(x / this.pointInterval);
		
		if(index < 0 || index >= this.points.length){
			return;
		}
		this.points[index].interfere(y, velocity);
	},
	reverseVertical : function(){
		this.reverse = !this.reverse;
		
		for(var i = 0, count = this.fishes.length; i < count; i++){
			this.fishes[i].reverseVertical();
		}
	},
	controlStatus : function(){
		for(var i = 0, count = this.points.length; i < count; i++){
			this.points[i].updateSelf();
		}
		for(var i = 0, count = this.points.length; i < count; i++){
			this.points[i].updateNeighbors();
		}
		if(this.fishes.length < this.fishCount){
			if(--this.intervalCount == 0){
				this.intervalCount = this.MAX_INTERVAL_COUNT;
				this.fishes.push(new FISH(this));
			}
		}
	},
	render : function(){
		// 记录每次注册的帧回调 id，供 init 在重新启动循环前取消旧循环，
		// 防止多条循环叠加导致小鱼运动速度成倍加快
		this.rafId = requestAnimationFrame(this.render);
		this.controlStatus();
		this.context.clearRect(0, 0, this.width, this.height);
		// 读取容器上设置的 CSS color 属性，实现与页脚主题色统一
		// 默认使用浅色半透明作为降级方案
		this.context.fillStyle = getComputedStyle(this.container).color || 'rgba(102, 204, 255, 0.35)';
		
		for(var i = 0, count = this.fishes.length; i < count; i++){
			this.fishes[i].render(this.context);
		}
		this.context.save();
		this.context.globalCompositeOperation = 'xor';
		this.context.beginPath();
		this.context.moveTo(0, this.reverse ? 0 : this.height);
		
		for(var i = 0, count = this.points.length; i < count; i++){
			this.points[i].render(this.context);
		}
		this.context.lineTo(this.width, this.reverse ? 0 : this.height);
		this.context.closePath();
		this.context.fill();
		this.context.restore();
	}
};
var SURFACE_POINT = function(renderer, x){
	this.renderer = renderer;
	this.x = x;
	this.init();
};
SURFACE_POINT.prototype = {
	SPRING_CONSTANT : 0.005,
	SPRING_FRICTION : 0.97,
	WAVE_SPREAD : 0.08,
	ACCELARATION_RATE : 0.002,
	
	init : function(){
		this.initHeight = this.renderer.height * this.renderer.INIT_HEIGHT_RATE;
		this.height = this.initHeight;
		this.fy = 0;
		this.force = {previous : 0, next : 0};
	},
	setPreviousPoint : function(previous){
		this.previous = previous;
	},
	setNextPoint : function(next){
		this.next = next;
	},
	interfere : function(y, velocity){
		this.fy = this.renderer.height * this.ACCELARATION_RATE * ((this.renderer.height - this.height - y) >= 0 ? -1 : 1) * Math.abs(velocity);
	},
	updateSelf : function(){
		this.fy += this.SPRING_CONSTANT * (this.initHeight - this.height);
		this.fy *= this.SPRING_FRICTION;
		this.height += this.fy;
	},
	updateNeighbors : function(){
		if(this.previous){
			this.force.previous = this.WAVE_SPREAD * (this.height - this.previous.height);
		}
		if(this.next){
			this.force.next = this.WAVE_SPREAD * (this.height - this.next.height);
		}
	},
	render : function(context){
		if(this.previous){
			this.previous.height += this.force.previous;
			this.previous.fy += this.force.previous;
		}
		if(this.next){
			this.next.height += this.force.next;
			this.next.fy += this.force.next;
		}
		context.lineTo(this.x, this.renderer.height - this.height);
	}
};
var FISH = function(renderer){
	this.renderer = renderer;
	this.init();
};
FISH.prototype = {
	GRAVITY : 0.4,
	// 小鱼整体运动速度倍率（0~1，值越小运动越慢）
	// 要让运动变慢而空间轨迹（跳跃高度、水平距离、路径形状）保持不变：
	//   - 速度是一阶量，缩放为 SPEED_RATE 倍
	//   - 加速度是二阶量，缩放为 SPEED_RATE * SPEED_RATE 倍
	// 这样时间轴被拉长，但 y 关于 x 的函数关系不变。
	SPEED_RATE : 0.5,

	init : function(){
		this.direction = Math.random() < 0.5;
		this.x = this.direction ? (this.renderer.width + this.renderer.THRESHOLD) : -this.renderer.THRESHOLD;
		this.previousY = this.y;
		// 水平速度乘以速度倍率，只降低游过屏幕的快慢，不改变起点到终点的水平距离
		this.vx = this.getRandomValue(4 * this.SPEED_RATE, 10 * this.SPEED_RATE) * (this.direction ? -1 : 1);

		if(this.renderer.reverse){
			this.y = this.getRandomValue(this.renderer.height * 1 / 10, this.renderer.height * 4 / 10);
			// 垂直速度是一阶量，按 SPEED_RATE 缩放；加速度是二阶量，按 SPEED_RATE 的平方缩放
			this.vy = this.getRandomValue(2 * this.SPEED_RATE, 5 * this.SPEED_RATE);
			this.ay = this.getRandomValue(0.05 * this.SPEED_RATE * this.SPEED_RATE, 0.2 * this.SPEED_RATE * this.SPEED_RATE);
		}else{
			this.y = this.getRandomValue(this.renderer.height * 6 / 10, this.renderer.height * 9 / 10);
			this.vy = this.getRandomValue(-5 * this.SPEED_RATE, -2 * this.SPEED_RATE);
			this.ay = this.getRandomValue(-0.2 * this.SPEED_RATE * this.SPEED_RATE, -0.05 * this.SPEED_RATE * this.SPEED_RATE);
		}
		this.isOut = false;
		this.theta = 0;
		this.phi = 0;
	},
	getRandomValue : function(min, max){
		return min + (max - min) * Math.random();
	},
	reverseVertical : function(){
		this.isOut = !this.isOut;
		this.ay *= -1;
	},
	controlStatus : function(context){
		this.previousY = this.y;
		this.x += this.vx;
		this.y += this.vy;
		this.vy += this.ay;

		if(this.renderer.reverse){
			if(this.y > this.renderer.height * this.renderer.INIT_HEIGHT_RATE){
				// 重力是加速度，按 SPEED_RATE 的平方缩放，保持下落和回弹轨迹不变
				this.vy -= this.GRAVITY * this.SPEED_RATE * this.SPEED_RATE;
				this.isOut = true;
			}else{
				if(this.isOut){
					this.ay = this.getRandomValue(0.05 * this.SPEED_RATE * this.SPEED_RATE, 0.2 * this.SPEED_RATE * this.SPEED_RATE);
				}
				this.isOut = false;
			}
		}else{
			if(this.y < this.renderer.height * this.renderer.INIT_HEIGHT_RATE){
				// 重力是加速度，按 SPEED_RATE 的平方缩放，保持上升和下落轨迹不变
				this.vy += this.GRAVITY * this.SPEED_RATE * this.SPEED_RATE;
				this.isOut = true;
			}else{
				if(this.isOut){
					this.ay = this.getRandomValue(-0.2 * this.SPEED_RATE * this.SPEED_RATE, -0.05 * this.SPEED_RATE * this.SPEED_RATE);
				}
				this.isOut = false;
			}
		}
		if(!this.isOut){
			this.theta += Math.PI / 20;
			this.theta %= Math.PI * 2;
			this.phi += Math.PI / 30;
			this.phi %= Math.PI * 2;
		}
		this.renderer.generateEpicenter(this.x + (this.direction ? -1 : 1) * this.renderer.THRESHOLD, this.y, this.y - this.previousY);
		
		if(this.vx > 0 && this.x > this.renderer.width + this.renderer.THRESHOLD || this.vx < 0 && this.x < -this.renderer.THRESHOLD){
			this.init();
		}
	},
	render : function(context){
		context.save();
		context.translate(this.x, this.y);
		context.rotate(Math.PI + Math.atan2(this.vy, this.vx));
		context.scale(1, this.direction ? 1 : -1);
		context.beginPath();
		context.moveTo(-30, 0);
		context.bezierCurveTo(-20, 15, 15, 10, 40, 0);
		context.bezierCurveTo(15, -10, -20, -15, -30, 0);
		context.fill();
		
		context.save();
		context.translate(40, 0);
		context.scale(0.9 + 0.2 * Math.sin(this.theta), 1);
		context.beginPath();
		context.moveTo(0, 0);
		context.quadraticCurveTo(5, 10, 20, 8);
		context.quadraticCurveTo(12, 5, 10, 0);
		context.quadraticCurveTo(12, -5, 20, -8);
		context.quadraticCurveTo(5, -10, 0, 0);
		context.fill();
		context.restore();
		
		context.save();
		context.translate(-3, 0);
		context.rotate((Math.PI / 3 + Math.PI / 10 * Math.sin(this.phi)) * (this.renderer.reverse ? -1 : 1));
		
		context.beginPath();
		
		if(this.renderer.reverse){
			context.moveTo(5, 0);
			context.bezierCurveTo(10, 10, 10, 30, 0, 40);
			context.bezierCurveTo(-12, 25, -8, 10, 0, 0);
		}else{
			context.moveTo(-5, 0);
			context.bezierCurveTo(-10, -10, -10, -30, 0, -40);
			context.bezierCurveTo(12, -25, 8, -10, 0, 0);
		}
		context.closePath();
		context.fill();
		context.restore();
		context.restore();
		this.controlStatus(context);
	}
};
// 脚本由页脚组件在挂载后动态加载，此刻 DOM 必然就绪；
// 保留就绪判断作为直接以 <script> 引入时的兜底
if(document.readyState === 'loading'){
	document.addEventListener('DOMContentLoaded', function(){
		RENDERER.init();
	});
}else{
	RENDERER.init();
}