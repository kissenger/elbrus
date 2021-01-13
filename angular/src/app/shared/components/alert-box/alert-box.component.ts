import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * See angular custom elements example: https://angular.io/guide/elements
 */

@Component({
  selector: 'app-alert-box',
  templateUrl: './alert-box.component.html',
  styleUrls: ['./alert-box.component.css']
})
export class AlertBoxComponent {
  // private state: 'opened' | 'closed' = 'closed';
  public _message: string;
  public _title: string;
  public _okBtn: boolean;
  public _cancelBtn: boolean;

  @Input()
  set message(message: string) { this._message = message; }
  get message(): string { return this._message; }

  @Input()
  set title(title: string) { this._title = title; }
  get title(): string { return this._title; }

  @Input()
  set okBtn(okBtn: boolean) { this._okBtn = okBtn; }
  get okBtn(): boolean { return this._okBtn; }

  @Input()
  set cancelBtn(cancelBtn: boolean) { this._cancelBtn = cancelBtn; }
  get cancelBtn(): boolean { return this._cancelBtn; }

  @Output()
  cancel = new EventEmitter();

  @Output()
  ok = new EventEmitter();

}
