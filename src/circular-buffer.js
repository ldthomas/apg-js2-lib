/**
 * @class
 circular buffer
 used by Trace to keep track of where the last N records are in a circular
 buffer used to store at most N trace information records
 * 
 * @version 2.0.0
 * @copyright Copyright &copy; 2015 Lowell D. Thomas, all rights reserved
 */
module.exports = function () {
	var thisFileName = "circular-buffer.js: ";
	var itemIndex = -1;
	var maxListSize = 0;
	var forward = true;

	// initialize the circular buffer for record collection
	this.init = function(size) {
		if(typeof(size) !== "number" || size <= 0){
			throw new Error(thisFileName + "init: circular buffer size must an integer > 0")
		}
		maxListSize = Math.ceil(size);
		itemIndex = -1;
	};

	// called once for each record collected
	this.increment = function() {
		itemIndex += 1;
		return (itemIndex + maxListSize) % maxListSize;
	};

	// returns the maxListSize (N))
	this.maxSize = function() {
		return maxListSize;
	}

	// returns highest record number
	this.items = function() {
		return itemIndex + 1;
	}
	
	this.getListIndex = function(item){
		if (itemIndex === -1) {
			return -1;
		}
		if(item < 0 || item > itemIndex){
			return -1;
		}
		if(itemIndex - item >= maxListSize){
			return -1;
		}
		return (item + maxListSize) % maxListSize;
	}
	
	// user's function, fn, will be called with arguments
	// fn(listIndex, itemIndex)
	this.forEach = function(fn){
		if(itemIndex === -1){
			return;
		}else if (itemIndex < maxListSize) {
			for(var i = 0; i <= itemIndex; i += 1){
				fn(i, i);
			}
		} else {
			for(var i = itemIndex - maxListSize + 1; i <= itemIndex; i += 1){
				var listIndex = (i + maxListSize) % maxListSize;
				fn(listIndex, i);
			}
		}
	}
}
