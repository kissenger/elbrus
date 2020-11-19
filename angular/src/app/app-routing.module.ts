import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Import components
import { RoutesCreateComponent } from './main/routes/routes-create/routes-create.component';
import { RoutesListComponent } from './main/routes/routes-list/routes-list.component';
import { RoutesReviewComponent } from './main/routes/routes-review/routes-review.component';
import { LoginComponent } from './secondary/login/login.component';
import { ProfileComponent } from './secondary/profile/profile.component';
import { MapSelectLocationComponent } from './secondary/map-select-location/map-select-location.component';
import { WelcomeComponent } from './secondary/welcome/welcome.component';
import { AuthGuard } from './auth.guard';

const appRoutes: Routes = [
  // { path: 'welcome', component: WelcomeComponent},
  { path: '', redirectTo: 'welcome', pathMatch: 'prefix'},
  { path: 'welcome', component: WelcomeComponent},
  { path: 'login', component: LoginComponent},
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard]},
  { path: 'profile/select-home', component: MapSelectLocationComponent, canActivate: [AuthGuard]},
  { path: ':pathType/list', component: RoutesListComponent},
  { path: ':pathType/list', component: RoutesListComponent},
  { path: ':pathType/list/:pathId', component: RoutesListComponent},
  { path: ':pathType/create', component: RoutesCreateComponent, canActivate: [AuthGuard], data : {callingPage : 'create'}},
  { path: ':pathType/edit', component: RoutesCreateComponent, canActivate: [AuthGuard], data : {callingPage : 'edit'}},
  { path: ':pathType/review', component: RoutesReviewComponent, canActivate: [AuthGuard]},
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})

export class AppRoutingModule { }
