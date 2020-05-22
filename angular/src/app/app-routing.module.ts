import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Import components
import { RoutesCreateComponent } from './main/routes/routes-create/routes-create.component';
import { RoutesListComponent } from './main/routes/routes-list/routes-list.component';
import { RoutesReviewComponent } from './main/routes/routes-review/routes-review.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { AuthGuard } from './auth.guard';

const appRoutes: Routes = [
  { path: 'welcome', component: WelcomeComponent},
  { path: '', component: RoutesListComponent, canActivate: [AuthGuard]},
  { path: ':pathType/list', component: RoutesListComponent, canActivate: [AuthGuard]},
  { path: ':pathType/create', component: RoutesCreateComponent, canActivate: [AuthGuard]},
  { path: ':pathType/review', component: RoutesReviewComponent, canActivate: [AuthGuard]},
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})

export class AppRoutingModule { }
