// Modules
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ChartsModule } from 'ng2-charts';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule } from '@angular/forms';

// Components
import { AppComponent } from './app.component';
import { MainComponent } from './main/main.component';
import { LandingComponent } from './landing/landing.component';
import { HeaderComponent } from './main/header/header.component';
import { RoutesCreateComponent } from './main/routes/routes-create/routes-create.component';
import { RoutesListComponent } from './main/routes/routes-list/routes-list.component';
import { InfoPanelComponent } from './main/info-panel/info-panel.component';
import { MenuBarComponent } from './main/menu-bar/menu-bar.component';
import { PanelsInjectorComponent } from './main/info-panel/panels-injector/panels-injector.component';
import { PanelDetailsFullComponent } from './main/info-panel/panels/panel-details-full/panel-details-full.component';
import { PanelDetailsSummaryComponent } from './main/info-panel/panels/panel-details-summary/panel-details-summary.component';
import { PanelListComponent } from './main/info-panel/panels/panel-list/panel-list.component';
import { PanelListItemComponent } from './main/info-panel/panels/panel-list/panel-list-item/panel-list-item.component';
import { PanelOptionsComponent } from './main/info-panel/panels/panel-options/panel-options.component';
import { SpinnerComponent } from './shared/components/spinner/spinner.component';
import { AlertBoxComponent } from './shared/components/alert-box/alert-box.component';
import { RoutesReviewComponent } from './main/routes/routes-review/routes-review.component';
import { WelcomeComponent } from './landing/welcome/welcome.component';
import { LoginComponent } from './landing/login/login.component';
import { ProfileComponent } from './main/profile/profile.component';
import { DisplayNarrowComponent } from './main/display-mobile/display-narrow.component';
import { DisplayWideComponent } from './main/display-desktop/display-wide.component';

// Services
import { HttpService } from './shared/services/http.service';
import { MapCreateService } from './shared/services/map-create.service';
import { MapService } from './shared/services/map.service';
import { AlertService } from './shared/services/alert.service';
import { SpinnerService } from './shared/services/spinner.service';
import { AuthService } from './shared/services/auth.service';
import { TokenInterceptorService } from './shared/services/token-interceptor.service';
import { PositionService } from './shared/services/position.service';
import { AuthGuard } from './auth.guard';
import { ErrorService } from './shared/services/error.service';
import { ScreenSizeService } from './shared/services/screen-size.service';

// Pipes
import { UnitsStringPipe } from './shared/pipes/units-string.pipe';
import { UnitsLongNamePipe } from './shared/pipes/units-longname.pipe';
import { UnitsConvertPipe } from './shared/pipes/units-convert.pipe';
import { GeoJsonPipe } from './shared/pipes/geojson.pipe';
import { NamePipe } from './shared/pipes/name.pipe';
import { AutoNamePipe } from './shared/pipes/auto-name.pipe';
import { ShortNamePipe } from './shared/pipes/short-name.pipe';
import { CoordsPipe } from './shared/pipes/coords.pipe';

@NgModule({
  declarations: [
    AppComponent,
    MainComponent,
    LandingComponent,
    HeaderComponent,
    RoutesCreateComponent,
    RoutesListComponent,
    InfoPanelComponent,
    MenuBarComponent,
    UnitsStringPipe,
    UnitsLongNamePipe,
    UnitsConvertPipe,
    GeoJsonPipe,
    NamePipe,
    AutoNamePipe,
    ShortNamePipe,
    CoordsPipe,
    PanelsInjectorComponent,
    PanelDetailsFullComponent,
    PanelDetailsSummaryComponent,
    PanelListComponent,
    PanelListItemComponent,
    PanelOptionsComponent,
    RoutesReviewComponent,
    SpinnerComponent,
    AlertBoxComponent,
    LoginComponent,
    WelcomeComponent,
    ProfileComponent,
    DisplayNarrowComponent,
    DisplayWideComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule,
    ChartsModule
  ],
  providers: [
    HttpService,
    ErrorService,
    MapCreateService,
    MapService,
    AlertService,
    SpinnerService,
    AuthService,
    PositionService,
    ScreenSizeService,
    AuthGuard,
    GeoJsonPipe,
    NamePipe,
    UnitsStringPipe,
    UnitsLongNamePipe,
    UnitsConvertPipe,
    AutoNamePipe,
    ShortNamePipe,
    CoordsPipe,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptorService,
      multi: true
    },
  ],
  bootstrap: [AppComponent],
  entryComponents: [
    PanelListComponent,
    PanelOptionsComponent,
    AlertBoxComponent,
    SpinnerComponent
    ]
})
export class AppModule { }
