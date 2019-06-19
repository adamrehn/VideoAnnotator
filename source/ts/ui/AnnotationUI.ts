import { AnnotatedSegment } from '../model/AnnotatedSegment';
import { AnnotatedFrame } from '../model/AnnotatedFrame';
import { AnnotatedVideo } from '../model/AnnotatedVideo';
import { SchemaField } from '../model/MetadataSchema';
import { StringUtils } from '../utility/StringUtils';
import { DialogProvider } from './DialogProvider';
import { ErrorHandler } from './ErrorHandler';
import * as electron from 'electron';
import * as $ from 'jquery';

export class AnnotationUI
{
	//Our annotated video data
	private data : AnnotatedVideo;
	
	//Our root container element
	private container : JQuery<HTMLDivElement>;
	
	//Our video playback element
	private video : JQuery<HTMLVideoElement>;
	
	//Our video playback overlay
	private overlay : JQuery<HTMLDivElement>;
	
	//Our controls wrapper
	private controls : JQuery<HTMLDivElement>;
	
	//Our timeline wrapper, progress element, and indicator container
	private timeline : JQuery<HTMLDivElement>;
	private progress : JQuery<HTMLProgressElement>;
	private indicators : JQuery<HTMLDivElement>;
	
	//Our dataset controls
	private datasetControls : JQuery<HTMLDivElement>;
	private saveButton : JQuery<HTMLButtonElement>;
	private closeButton : JQuery<HTMLButtonElement>;
	
	//Our playback controls
	private playbackControls : JQuery<HTMLDivElement>;
	private jumpBackButton : JQuery<HTMLButtonElement>;
	private stepBackButton : JQuery<HTMLButtonElement>;
	private playButton : JQuery<HTMLButtonElement>;
	private stepForwardButton : JQuery<HTMLButtonElement>;
	private jumpForwardButton : JQuery<HTMLButtonElement>;
	
	//Our annotation controls
	private annotationControls : JQuery<HTMLDivElement>;
	private startSegmentButton : JQuery<HTMLButtonElement>;
	private addFrameButton : JQuery<HTMLButtonElement>;
	private endSegmentButton : JQuery<HTMLButtonElement>;
	
	//Our metadata display containers
	private metadata : JQuery<HTMLDivElement>;
	private segmentMetadata : JQuery<HTMLDivElement>;
	private frameMetadata : JQuery<HTMLDivElement>;
	
	//The filename that was used when the dataset was last saved to disk
	private datasetFilename : string | null;
	
	//Our current playback state
	private isPlaying : boolean = false;
	
	//Whether the user is currently dragging the mouse inside the timeline
	private isDragging : boolean = false;
	
	//Whether we currently have unsaved annotation/metadata changes
	private haveUnsavedChanges : boolean = false;
	
	//Populates the supplied container with the annotation UI elements
	public constructor(container : JQuery<HTMLDivElement>, data : AnnotatedVideo, datasetFilename : string | null)
	{
		//Store the root container and annotated video data
		this.container = container;
		this.data = data;
		
		//If the dataset is a new file then our initial state counts as having unsaved changes
		this.datasetFilename = datasetFilename;
		if (this.datasetFilename === null) {
			this.markUnsaved();
		}
		else {
			this.markSaved();
		}
		
		//Create our video playback element
		this.video = $(document.createElement('video'));
		this.video.attr('src', this.data.video);
		this.video[0].muted = true;
		
		//Create our video playback overlay
		this.overlay = $(document.createElement('div')).addClass('overlay');
		
		//Create a wrapper around our video playback element and overlay for styling use
		let videoWrapper = $(document.createElement('div')).addClass('video-wrapper');
		videoWrapper.append(this.overlay, this.video);
		this.container.append(videoWrapper);
		
		//Create a wrapper to hold all of our controls
		this.controls = $(document.createElement('div')).addClass('controls');
		this.container.append(this.controls);
		
		//Create our timeline wrapper, playback progress element, and indicator container
		this.timeline = $(document.createElement('div')).addClass('timeline');
		this.indicators = $(document.createElement('div')).addClass('indicators');
		this.progress = $(document.createElement('progress'));
		this.progress.attr('value', 0);
		this.progress.attr('min', 0);
		this.timeline.append(this.indicators, this.progress);
		this.controls.append(this.timeline);
		
		//Create our dataset controls
		let datasetControlsWrapper = $(document.createElement('div')).addClass('control-wrapper');
		let datasetControlsLabel = $(document.createElement('p')).addClass('control-label').text('Dataset');
		this.datasetControls = $(document.createElement('div')).addClass('dataset-controls');
		this.saveButton = this.createButton('save', 'Save the dataset');
		this.closeButton = this.createButton('times-circle', 'Close the dataset');
		this.datasetControls.append(this.saveButton, this.closeButton);
		datasetControlsWrapper.append(datasetControlsLabel, this.datasetControls);
		this.controls.append(datasetControlsWrapper);
		
		//Create our playback controls
		let playbackControlsWrapper = $(document.createElement('div')).addClass('control-wrapper');
		let playbackControlsLabel = $(document.createElement('p')).addClass('control-label').text('Playback');
		this.playbackControls = $(document.createElement('div')).addClass('playback-controls');
		this.jumpBackButton = this.createButton('backward', 'Jump backward by one second');
		this.stepBackButton = this.createButton('step-backward', 'Step backward by one frame');
		this.playButton = $(document.createElement('button'));
		this.stepForwardButton = this.createButton('step-forward', 'Step forward by one frame');
		this.jumpForwardButton = this.createButton('forward', 'Jump forward by one second');
		this.playbackControls.append(this.jumpBackButton, this.stepBackButton, this.playButton, this.stepForwardButton, this.jumpForwardButton);
		playbackControlsWrapper.append(playbackControlsLabel, this.playbackControls);
		this.controls.append(playbackControlsWrapper);
		
		//Create our annotation controls
		let annotationControlsWrapper = $(document.createElement('div')).addClass('control-wrapper');
		let annotationControlsLabel = $(document.createElement('p')).addClass('control-label').text('Annotation');
		this.annotationControls = $(document.createElement('div')).addClass('annotation-controls');
		this.startSegmentButton = this.createButton('sign-out-alt', 'Start a new segment');
		this.addFrameButton = this.createButton('grip-lines-vertical', 'Annotate this frame');
		this.endSegmentButton = this.createButton('sign-in-alt', 'End the current segment');
		this.annotationControls.append(this.startSegmentButton, this.addFrameButton, this.endSegmentButton);
		annotationControlsWrapper.append(annotationControlsLabel, this.annotationControls);
		this.controls.append(annotationControlsWrapper);
		
		//Create our metadata display containers
		this.metadata = $(document.createElement('div')).addClass('metadata');
		let segmentWrapper = $(document.createElement('div')).addClass('segment-wrapper');
		this.segmentMetadata = $(document.createElement('div')).addClass('segment');
		let frameWrapper = $(document.createElement('div')).addClass('frame-wrapper');
		this.frameMetadata = $(document.createElement('div')).addClass('frame');
		segmentWrapper.append(this.segmentMetadata);
		frameWrapper.append(this.frameMetadata);
		this.metadata.append(segmentWrapper, frameWrapper);
		this.controls.append(this.metadata);
		
		//Create a temporary metadata display so we can retrieve the calculated display dimensions
		let tempHeading = $(document.createElement('p')).addClass('heading').text('&nbsp;');
		let tempGrid = $(document.createElement('div')).addClass('field-grid');
		let tempField : SchemaField = {'name': '', 'type': 'string', 'values': []};
		this.createMetadataField(tempGrid, tempField, '', (input : JQuery<HTMLElement>) => {});
		let tempDelete = this.createDeleteButton('', () => {});
		this.segmentMetadata.append(tempHeading, tempGrid, tempDelete);
		let headingHeight = <number>(tempHeading.outerHeight(true));
		let fieldHeight = <number>(tempGrid.outerHeight(true));
		let fieldGutter = Number.parseFloat(tempGrid.css('grid-row-gap').replace('px', ''));
		let deleteHeight = <number>(tempDelete.outerHeight(true));
		tempHeading.remove();
		tempGrid.remove();
		tempDelete.remove();
		
		//Set a minimum height for our metadata display containers that is appropriate for accommodating our metadata fields
		//(This helps to alleviate the jarring effect of resizing the video playback area when we select an annotated segment or frame)
		let maxFields = Math.max(this.data.schema.fields.segments.length, this.data.schema.fields.frames.length);
		let baseHeight = <number>(this.segmentMetadata.outerHeight()) + headingHeight + deleteHeight;
		this.segmentMetadata.css('min-height', `${baseHeight + (fieldHeight * maxFields) + (fieldGutter * (maxFields - 1))}px`);
		
		//Set our initial playback state
		this.setPlaybackState(false);
		
		//Wire up our event listeners
		this.wireEvents();
	}
	
	//Creates a button with the specified icon and tooltip
	private createButton(icon : string, tooltip : string)
	{
		let button = $(document.createElement('button'));
		button.html(`<span class="icon fas fa-fw fa-${icon}"></span>`);
		button.attr('title', tooltip);
		return button;
	}
	
	//Creates a delete button for a segment/frame
	private createDeleteButton(text : string, handler : ()=>void)
	{
		let deleteWrapper = $(document.createElement('p')).addClass('delete');
		let deleteButton = $(document.createElement('button')).text(text);
		deleteWrapper.append(deleteButton);
		deleteButton.click(handler);
		return deleteWrapper;
	}
	
	//Creates an input element for the supplied metadata field
	private createInput(field : SchemaField, value : any)
	{
		//If the field has a list of permissable values then create a dropdown list
		if (field.values !== undefined && field.values.length > 0)
		{
			let dropdown = $(document.createElement('select'));
			dropdown.append(field.values.map((value : any) =>
			{
				return $(document.createElement('option'))
					.attr('value', value)
					.text(value);
			}));
			
			dropdown.val(value);
			return dropdown;
		}
		
		//For freeform fields use the appropriate input element for the field's datatype
		switch (field.type)
		{
			case 'boolean':
				let checkbox = $(document.createElement('input')).attr('type', 'checkbox');
				if (value === true) {
					checkbox.attr('checked', 'checked');
				}
				
				return checkbox;
			
			case 'float':
				return $(document.createElement('input'))
					.attr('type', 'number')
					.attr('step', '0.0000001')
					.val(value);
			
			case 'int':
				return $(document.createElement('input'))
					.attr('type', 'number')
					.val(value);
			
			case 'string':
				return $(document.createElement('input'))
					.attr('type', 'text')
					.val(value);
			
			default:
				throw new Error(`unrecognised metadata datatype "${field.type}"`);
		}
	}
	
	//Creates an in input element with associated label for a metadata field
	private createMetadataField(grid : JQuery<HTMLElement>, field : SchemaField, value : any, handler : (input : JQuery<HTMLElement>)=>void)
	{
		//Create the input element for the field
		let label = $(document.createElement('span')).addClass('label').text(`${field.name}: `);
		let inputWrapper = $(document.createElement('span')).addClass('input');
		let input = this.createInput(field, value);
		inputWrapper.append(input);
		
		//Wire up the update event for the input element
		input.on('change', () => {
			handler(input);
		});
		
		//Add the label and the input wrapper to the field grid
		grid.append(label, inputWrapper);
	}
	
	//Retrieves the current value for an input element
	private getInputValue(input : JQuery<HTMLElement>)
	{
		//If the input element is a checkbox then determine if it is checked
		if (input.attr('type') == 'checkbox') {
			return input.is(':checked');
		}
		
		//Return the raw value for all other element types
		return input.val();
	}
	
	//Handles a window close request
	private handleWindowClose(reopenFileWindow : boolean)
	{
		//Determine if we have unsaved changes
		if (this.haveUnsavedChanges === true)
		{
			//Prompt the user to confirm the close
			DialogProvider.showConfirmDialog('You have unsaved changes that will be lost if you close the application.\n\nAre you sure you want to continue?', 'Close and discard changes')
			.then(() =>
			{
				//User opted to permit the close operation
				this.closeWindow(reopenFileWindow);
			})
			.catch(() => {
				//User opted to cancel the close operation
			});
		}
		else
		{
			//No unsaved changes, so permit the close operation
			this.closeWindow(reopenFileWindow);
		}
	}
	
	//Closes the window, optionally reopening the file browser window
	private closeWindow(reopenFileWindow : boolean)
	{
		//Remove our `onbeforeunload` event handler
		window.onbeforeunload = (e) => {};
		
		//Reopen the file browser window if requested
		if (reopenFileWindow === true) {
			electron.ipcRenderer.send('close-dataset');
		}
		
		//Close this browser window
		electron.remote.getCurrentWindow().close();
	}
	
	//Updates the window title to reflect the current application state
	private updateTitle()
	{
		let filename = ((this.datasetFilename !== null) ? this.datasetFilename : 'New Dataset');
		let saved = ((this.haveUnsavedChanges === true) ? '* [Unsaved Changes]' : '');
		$('title').text(`${electron.remote.app.getName()} - ${filename}${saved}`);
	}
	
	//Marks the dataset as having unsaved changes
	private markUnsaved()
	{
		this.haveUnsavedChanges = true;
		this.updateTitle();
	}
	
	//Marks all changes to the dataset as having been saved
	private markSaved()
	{
		this.haveUnsavedChanges = false;
		this.updateTitle();
	}
	
	//Sets our playback state and updates our playback controls accordingly
	private setPlaybackState(playing : boolean)
	{
		//Store our new playback state
		this.isPlaying = playing;
		
		//Update our playback controls
		let otherState = (playing === true) ? 'pause' : 'play';
		this.playButton.data('action', otherState);
		this.playButton.html(`<span class="icon fas fa-fw fa-${otherState}"></span>`);
		this.playButton.attr('title', otherState.substr(0, 1).toUpperCase() + otherState.substr(1));
		
		//Only enable annotation and metadata controls while playback is paused
		this.updateEditControlsState();
	}
	
	//Retrieves the current playback position, rounding to the nearest frame
	private currentPosition() {
		return this.data.toNearestFrame(this.video[0].currentTime);
	}
	
	//Retrieves the frame number of the current playback position
	private currentFrame() {
		return Math.round(this.currentPosition() * this.data.details.framerate);
	}
	
	//Seeks to an absolute playback position, rounding to the nearest frame
	private seek(position : number) {
		this.video[0].currentTime = this.data.toNearestFrame(position);
	}
	
	//Seeks to a position in the video relative to the current position
	private seekToOffset(offset : number)
	{
		//Compute the new position and clamp it to the video bounds
		let newPosition = this.currentPosition() + offset;
		newPosition = Math.min(this.video[0].duration, newPosition);
		newPosition = Math.max(0, newPosition);
		
		//Seek to the new position
		this.seek(newPosition);
	}
	
	//Handles a window resize event
	private handleResize()
	{
		//Determine the current height of our controls
		let controlsHeight = <number>this.controls.outerHeight();
		
		//Constrain the maximum height of the video playback element to provide room for our controls
		this.video.css('max-height', `calc(100vh - ${controlsHeight}px)`);
	}
	
	//Handles a timeline seek event
	private handleTimelineSeek(pageX : number)
	{
		//Determine the progress percentage and seek to the corresponding frame
		let pos = (pageX - this.indicators[0].offsetLeft) / this.indicators[0].offsetWidth;
		this.seek(pos * this.video[0].duration);
	}
	
	//Refreshes our UI in response to an update to our dataset
	private refreshDataViews()
	{
		this.refreshIndicators();
		this.refreshMetadata();
		this.updateEditControlsState();
		this.handleResize();
	}
	
	//Refreshes our playback overlay
	private refreshOverlay()
	{
		//Clear the overlay
		this.overlay.empty();
		
		//Display the current playback position in human-readable form
		let position = $(document.createElement('p')).addClass('position');
		position.text(StringUtils.formatPosition(this.currentPosition()));
		this.overlay.append(position);
		
		//Display the current frame number
		let frame = $(document.createElement('p')).addClass('frame');
		frame.text(`Frame ${this.currentFrame()}`);
		this.overlay.append(frame);
	}
	
	//Refreshes our metadata displays
	private refreshMetadata()
	{
		//Clear any existing metadata displays
		this.segmentMetadata.empty();
		this.frameMetadata.empty();
		
		//Determine if we are currently viewing an annotated segment
		let segment = this.data.getSegment(this.currentPosition());
		if (segment !== null)
		{
			//Create a heading for the segment metadata display
			let heading = $(document.createElement('p')).addClass('heading');
			heading.text(`Segment from ${StringUtils.formatPosition(segment.start)} to ${StringUtils.formatPosition(segment.end)}`);
			this.segmentMetadata.append(heading);
			
			//Display a message if there are no segment-specific metadata fields
			if (this.data.schema.fields.segments.length == 0) {
				this.segmentMetadata.append('<em>The dataset schema does not define any metadata fields for annotated segments.</em>');
			}
			else
			{
				//Create a grid to hold our field labels and inputs
				let grid = $(document.createElement('div')).addClass('field-grid');
				this.segmentMetadata.append(grid);
				
				//Create fields for each segment metadata field
				for (let field of this.data.schema.fields.segments)
				{
					//Create the input element and label for the field and add them to the grid
					this.createMetadataField(grid, field, segment.metadata.get(field.name), (input : JQuery<HTMLElement>) =>
					{
						(<AnnotatedSegment>segment).metadata.set(field.name, this.getInputValue(input));
						this.markUnsaved();
					});
				}
			}
			
			//Create the delete button for the segment
			this.segmentMetadata.append(this.createDeleteButton('Delete Segment', () =>
			{
				//Prompt the user to confirm the deletion
				DialogProvider.showConfirmDialog('This will delete the annotated segment along with all of the annotated frames that the segment contains.\n\nAre you sure you want to continue?', 'Delete Segment')
				.then(() =>
				{
					//Delete the segment
					this.data.deleteSegment(this.currentPosition());
					this.refreshDataViews();
					this.markUnsaved();
				})
				.catch(() => {
					//User opted to cancel the delete operation
				});
			}));
			
			//Determine if we are currently viewing an annotated frame
			let frame = segment.getFrame(this.currentPosition());
			if (frame !== null)
			{
				//Create a heading for the segment metadata display
				let heading = $(document.createElement('p')).addClass('heading');
				heading.text(`Frame at ${StringUtils.formatPosition(frame.position)}`);
				this.frameMetadata.append(heading);
				
				//Display a message if there are no frame-specific metadata fields
				if (this.data.schema.fields.frames.length == 0) {
					this.frameMetadata.append('<em>The dataset schema does not define any metadata fields for annotated frames.</em>');
				}
				else
				{
					//Create a grid to hold our field labels and inputs
					let grid = $(document.createElement('div')).addClass('field-grid');
					this.frameMetadata.append(grid);
					
					//Create fields for each frame metadata field
					for (let field of this.data.schema.fields.frames)
					{
						//Create the input element and label for the field and add them to the grid
						this.createMetadataField(grid, field, frame.metadata.get(field.name), (input : JQuery<HTMLElement>) =>
						{
							(<AnnotatedFrame>frame).metadata.set(field.name, this.getInputValue(input));
							this.markUnsaved();
						});
					}
				}
				
				//Create the delete button for the frame
				this.frameMetadata.append(this.createDeleteButton('Delete Frame', () =>
				{
					//Prompt the user to confirm the deletion
					DialogProvider.showConfirmDialog('This will delete the annotated frame and its metadata.\n\nAre you sure you want to continue?', 'Delete Frame')
					.then(() =>
					{
						//Delete the frame
						this.data.deleteFrame(this.currentPosition());
						this.refreshDataViews();
						this.markUnsaved();
					})
					.catch(() => {
						//User opted to cancel the delete operation
					});
				}));
			}
			else {
				this.frameMetadata.html('<em>No annotated frame at the current playback position.</em>');
			}
		}
		else
		{
			this.segmentMetadata.html('<em>No annotated segment at the current playback position.</em>');
			this.frameMetadata.html('<em>No annotated frame at the current playback position.</em>');
		}
	}
	
	//Enables or disables our annotation and metadata controls based on the current metadata state
	private updateEditControlsState()
	{
		if (this.isPlaying === true) {
			this.disableEditControls();
		}
		else {
			this.enableEditControls();
		}
	}
	
	//Enables our annotation and metadata controls
	private enableEditControls()
	{
		$('button', this.annotationControls).removeAttr('disabled');
		$('button, input, select', this.metadata).removeAttr('disabled');
	}
	
	//Disables our annotation and metadata controls
	private disableEditControls()
	{
		$('button', this.annotationControls).attr('disabled', 'disabled');
		$('button, input, select', this.metadata).attr('disabled', 'disabled');
	}
	
	//Refreshes our annotation indicators
	private refreshIndicators()
	{
		//Clear any existing indicators
		this.indicators.empty();
		
		//Create indicators for each annotated segment
		for (let segment of this.data.getSegments())
		{
			//Compute the size and position of the segment indicator
			let start = (segment.start / this.data.details.duration) * 100.0;
			let end = (segment.end / this.data.details.duration) * 100.0;
			let width = end - start;
			
			//Add the segment indicator
			let segmentIndicator = $(document.createElement('div')).addClass('segment');
			segmentIndicator.css('left', `${start}%`);
			segmentIndicator.css('width', `${width}%`);
			this.indicators.append(segmentIndicator);
			
			//Create indicators for each annotated frame in the segment
			for (let frame of segment.getFrames())
			{
				//Compute the position of the frame indicator
				let position = (frame.position / this.data.details.duration) * 100.0;
				
				//Add the frame indicator
				let frameIndicator = $(document.createElement('div')).addClass('frame');
				frameIndicator.css('left', `${position}%`);
				this.indicators.append(frameIndicator);
			}
		}
	}
	
	//Wires up our event listeners
	private wireEvents()
	{
		//Wire up the window close event
		window.onbeforeunload = (e) =>
		{
			//Prevent the default close operation
			e.preventDefault();
			e.returnValue = false;
			
			//Invoke our close handler once this event handler has completed
			window.requestAnimationFrame(() => {
				this.handleWindowClose(false);
			});
		};
		
		//Wire up resize events and trigger an initial resize
		$(window).resize(() => { this.handleResize(); });
		this.handleResize();
		
		//Wire up the save button
		this.saveButton.click(() =>
		{
			//If the dataset hasn't been saved previously then prompt the user for a filename
			if (this.datasetFilename === null)
			{
				DialogProvider.showSaveDialog('Save dataset', [{name: 'Dataset files', extensions: ['json']}])
				.then((path : string) =>
				{
					if (path !== undefined && path.length > 0)
					{
						//Store the filename and re-trigger the save button click
						this.datasetFilename = path;
						this.saveButton.trigger('click');
					}
				})
				.catch(() => {
					//The user cancelled the open dialog
				});
			}
			else
			{
				//Attempt to save the dataset to disk
				this.data.toJSON(this.datasetFilename).then(() =>
				{
					//Mark all changes to the dataset as saved
					this.markSaved();
					DialogProvider.showMessage('Dataset saved.');
				})
				.catch((err : Error) => {
					ErrorHandler.handleError(err);
				});
			}
		});
		
		//Wire up the close button
		this.closeButton.click(() => {
			this.handleWindowClose(true);
		});
		
		//Set the maximum value for our progress bar once we know the video duration
		this.video.on('loadedmetadata', () =>
		{
			this.progress.attr('max', this.video[0].duration);
			this.refreshOverlay();
			this.refreshDataViews();
		});
		
		//Update the progress bar as playback progresses
		this.video.on('timeupdate', () =>
		{
			this.progress.val(this.currentPosition());
			this.refreshOverlay();
			this.refreshDataViews();
		});
		
		//Update our playback state when the video's playback state changes
		this.video.on('play', () => { this.setPlaybackState(true); });
		this.video.on('pause', () => { this.setPlaybackState(false); });
		
		//Toggle the playback state when the user clicks the Play/Pause button
		this.playButton.click(() =>
		{
			if (this.playButton.data('action') == 'play') {
				this.video[0].play();
			}
			else {
				this.video[0].pause();
			}
		});
		
		//Alias clicks on the video playback element itself to the Play/Pause button
		this.video.click(() => { this.playButton.trigger('click'); });
		
		//Seek to the specified frame when the user clicks the progress bar in the timeline
		//(Note that the indicators container sits over the progress bar, so it receives the actual click events)
		this.indicators.click((e : JQuery.ClickEvent) => {
			this.handleTimelineSeek(e.pageX);
		});
		
		//Enable seeking using mouse dragging inside the timeline
		$('body').mouseup(() => { this.isDragging = false; });
		$('body').mouseleave(() => { this.isDragging = false; });
		this.indicators.mousedown((e : JQuery.MouseDownEvent) =>
		{
			this.isDragging = true;
			this.handleTimelineSeek(e.pageX);
		});
		this.indicators.mousemove((e : JQuery.MouseMoveEvent) =>
		{
			if (this.isDragging == true) {
				this.handleTimelineSeek(e.pageX);
			}
		});
		
		//Wire up our playback seek buttons
		this.jumpBackButton.click(() => { this.seekToOffset(-1.0); });
		this.stepBackButton.click(() => { this.seekToOffset(0 - (1.0 / this.data.details.framerate)); });
		this.stepForwardButton.click(() => { this.seekToOffset(1.0 / this.data.details.framerate); });
		this.jumpForwardButton.click(() => { this.seekToOffset(1.0); });
		
		//Wire up the "add segment" button
		this.startSegmentButton.click(() =>
		{
			try
			{
				this.data.addSegment(this.currentPosition());
				this.refreshDataViews();
				this.markUnsaved();
			}
			catch (err) {
				ErrorHandler.handleError(err);
			}
		});
		
		//Wire up the "end segment" button
		this.endSegmentButton.click(() =>
		{
			//Lambda function for performing truncation
			const truncate = () =>
			{
				this.data.truncateSegment(this.currentPosition(), this.currentPosition());
				this.refreshDataViews();
				this.markUnsaved();
			};
			
			try
			{
				//If one or more frames will be discarded by the truncation then prompt the user for confirmation
				let wouldDiscard = this.data.truncateWouldDiscard(this.currentPosition(), this.currentPosition());
				if (wouldDiscard > 0)
				{
					DialogProvider.showConfirmDialog(`Truncating the segment to this new end position will delete ${wouldDiscard} annotated frames.\n\nAre you sure you want to continue?`, 'Truncate')
					.then(() => {
						truncate();
					})
					.catch(() => {
						//User opted to cancel the truncate operation
					});
				}
				else {
					truncate();
				}
			}
			catch (err) {
				ErrorHandler.handleError(err);
			}
		});
		
		//Wire up the "add frame" button
		this.addFrameButton.click(() =>
		{
			try
			{
				this.data.addFrame(this.currentPosition());
				this.refreshDataViews();
				this.markUnsaved();
			}
			catch (err) {
				ErrorHandler.handleError(err);
			}
		});
	}
}
